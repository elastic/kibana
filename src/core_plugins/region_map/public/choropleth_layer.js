import $ from 'jquery';
import L from 'leaflet';
import _ from 'lodash';
import d3 from 'd3';
import { KibanaMapLayer } from 'ui/vis/map/kibana_map_layer';
import { truncatedColorMaps } from 'ui/vislib/components/color/truncated_colormaps';
import * as topojson from 'topojson-client';
import { toastNotifications } from 'ui/notify';

const EMPTY_STYLE = {
  weight: 1,
  opacity: 0.6,
  color: 'rgb(200,200,200)',
  fillOpacity: 0
};


export default class ChoroplethLayer extends KibanaMapLayer {

  static _doInnerJoin(sortedMetrics, sortedGeojsonFeatures, joinField) {
    let j = 0;
    for (let i = 0; i < sortedGeojsonFeatures.length; i++) {
      const property = sortedGeojsonFeatures[i].properties[joinField];
      sortedGeojsonFeatures[i].__kbnJoinedMetric = null;
      const position = sortedMetrics.length ? compareLexographically(property, sortedMetrics[j].term) : -1;
      if (position === -1) {//just need to cycle on
      } else if (position === 0) {
        sortedGeojsonFeatures[i].__kbnJoinedMetric = sortedMetrics[j];
      } else if (position === 1) {//needs to catch up
        while (j < sortedMetrics.length) {
          const newTerm = sortedMetrics[j].term;
          const newPosition = compareLexographically(newTerm, property);
          if (newPosition === -1) {//not far enough
          } else if (newPosition === 0) {
            sortedGeojsonFeatures[i].__kbnJoinedMetric = sortedMetrics[j];
            break;
          } else if (newPosition === 1) {//too far!
            break;
          }
          if (j === sortedMetrics.length - 1) {//always keep a reference to the last metric
            break;
          } else {
            j++;
          }
        }
      }
    }
  }


  constructor(geojsonUrl, attribution, format, showAllShapes, meta) {
    super();

    this._metrics = null;
    this._joinField = null;
    this._colorRamp = truncatedColorMaps[Object.keys(truncatedColorMaps)[0]];
    this._lineWeight = 1;
    this._tooltipFormatter = () => '';
    this._attribution = attribution;
    this._boundsOfData = null;

    this._showAllShapes = showAllShapes;
    this._geojsonUrl = geojsonUrl;

    this._leafletLayer = L.geoJson(null, {
      onEachFeature: (feature, layer) => {
        layer.on('click', () => {
          this.emit('select', feature.properties[this._joinField]);
        });
        let location = null;
        layer.on({
          mouseover: () => {
            const tooltipContents = this._tooltipFormatter(feature);
            if (!location) {
              const leafletGeojon = L.geoJson(feature);
              location = leafletGeojon.getBounds().getCenter();
            }
            this.emit('showTooltip', {
              content: tooltipContents,
              position: location
            });
          },
          mouseout: () => {
            this.emit('hideTooltip');
          }
        });
      },
      style: this._makeEmptyStyleFunction()
    });

    this._loaded = false;
    this._error = false;
    this._isJoinValid = false;
    this._whenDataLoaded = new Promise(async (resolve) => {
      try {
        const data = await this._makeJsonAjaxCall(geojsonUrl);
        let featureCollection;
        const formatType = typeof format === 'string' ? format : format.type;
        if (formatType === 'geojson') {
          featureCollection = data;
        } else if (formatType === 'topojson') {
          const features = _.get(data, 'objects.' + meta.feature_collection_path);
          featureCollection = topojson.feature(data, features);//conversion to geojson
        } else {
          //should never happen
          throw new Error('Unrecognized format ' + formatType);
        }
        this._sortedFeatures = featureCollection.features.slice();
        this._sortFeatures();

        if (showAllShapes) {
          this._leafletLayer.addData(featureCollection);
        } else {
          //we need to delay adding the data until we have performed the join and know which features
          //should be displayed
        }
        this._loaded = true;
        this._setStyle();
        resolve();
      } catch (e) {
        this._loaded = true;
        this._error = true;

        let errorMessage;
        if (e.status === 404) {
          errorMessage = `Server responding with '404' when attempting to fetch ${geojsonUrl}. 
                          Make sure the file exists at that location.`;
        } else {
          errorMessage = `Cannot download ${geojsonUrl} file. Please ensure the
CORS configuration of the server permits requests from the Kibana application on this host.`;
        }

        toastNotifications.addDanger({
          title: 'Error downloading vector data',
          text: errorMessage,
        });

        resolve();
      }
    });

  }

  //This method is stubbed in the tests to avoid network request during unit tests.
  async _makeJsonAjaxCall(url) {
    return await $.ajax({
      dataType: 'json',
      url: url
    });
  }

  _invalidateJoin() {
    this._isJoinValid = false;
  }

  _doInnerJoin() {
    ChoroplethLayer._doInnerJoin(this._metrics, this._sortedFeatures, this._joinField);
    this._isJoinValid = true;
  }

  _setStyle() {
    if (this._error || (!this._loaded || !this._metrics || !this._joinField)) {
      return;
    }

    if (!this._isJoinValid) {
      this._doInnerJoin();
      if (!this._showAllShapes) {
        const featureCollection = {
          type: 'FeatureCollection',
          features: this._sortedFeatures.filter(feature => feature.__kbnJoinedMetric)
        };
        this._leafletLayer.addData(featureCollection);
      }
    }

    const styler = this._makeChoroplethStyler();
    this._leafletLayer.setStyle(styler.leafletStyleFunction);

    if (this._metrics && this._metrics.length > 0) {
      const { min, max } = getMinMax(this._metrics);
      this._legendColors = getLegendColors(this._colorRamp);
      const quantizeDomain = (min !== max) ? [min, max] : d3.scale.quantize().domain();
      this._legendQuantizer = d3.scale.quantize().domain(quantizeDomain).range(this._legendColors);
    }
    this._boundsOfData = styler.getLeafletBounds();
    this.emit('styleChanged', {
      mismatches: styler.getMismatches()
    });
  }

  getUrl() {
    return this._geojsonUrl;
  }

  setTooltipFormatter(tooltipFormatter, metricsAgg, fieldName) {
    this._tooltipFormatter = (geojsonFeature) => {
      if (!this._metrics) {
        return '';
      }
      const match = this._metrics.find((bucket) => {
        return bucket.term === geojsonFeature.properties[this._joinField];
      });
      return tooltipFormatter(metricsAgg, match, fieldName);
    };
  }

  setJoinField(joinfield) {
    if (joinfield === this._joinField) {
      return;
    }
    this._joinField = joinfield;
    this._sortFeatures();
    this._setStyle();
  }

  cloneChoroplethLayerForNewData(url, attribution, format, showAllData, meta) {
    const clonedLayer = new ChoroplethLayer(url, attribution, format, showAllData, meta);
    clonedLayer.setJoinField(this._joinField);
    clonedLayer.setColorRamp(this._colorRamp);
    clonedLayer.setLineWeight(this._lineWeight);
    clonedLayer.setTooltipFormatter(this._tooltipFormatter);
    if (this._metrics && this._metricsAgg) {
      clonedLayer.setMetrics(this._metrics, this._metricsAgg);
    }
    return clonedLayer;
  }

  _sortFeatures() {
    if (this._sortedFeatures && this._joinField) {
      this._sortedFeatures.sort((a, b) => {
        const termA = a.properties[this._joinField];
        const termB = b.properties[this._joinField];
        return compareLexographically(termA, termB);
      });
      this._invalidateJoin();
    }
  }

  whenDataLoaded() {
    return this._whenDataLoaded;
  }

  setMetrics(metrics, metricsAgg) {
    this._metrics = metrics.slice();

    this._metricsAgg = metricsAgg;
    this._valueFormatter = this._metricsAgg.fieldFormatter();

    this._metrics.sort((a, b) => compareLexographically(a.term, b.term));
    this._invalidateJoin();
    this._setStyle();
  }


  setColorRamp(colorRamp) {
    if (_.isEqual(colorRamp, this._colorRamp)) {
      return;
    }
    this._colorRamp = colorRamp;
    this._setStyle();
  }

  setLineWeight(lineWeight) {
    if (this._lineWeight === lineWeight) {
      return;
    }
    this._lineWeight = lineWeight;
    this._setStyle();
  }

  canReuseInstance(geojsonUrl, showAllShapes) {
    return this._geojsonUrl === geojsonUrl && this._showAllShapes === showAllShapes;
  }

  canReuseInstanceForNewMetrics(geojsonUrl, showAllShapes, newMetrics) {
    if (this._geojsonUrl !== geojsonUrl) {
      return false;
    }

    if (showAllShapes) {
      return this._showAllShapes === showAllShapes;
    }

    if (!this._metrics) {
      return;
    }

    const currentKeys = Object.keys(this._metrics);
    const newKeys = Object.keys(newMetrics);
    return _.isEqual(currentKeys, newKeys);
  }

  getBounds() {
    const bounds = super.getBounds();
    return (this._boundsOfData) ? this._boundsOfData : bounds;
  }

  appendLegendContents(jqueryDiv) {

    if (!this._legendColors || !this._legendQuantizer || !this._metricsAgg) {
      return;
    }

    const titleText = this._metricsAgg.makeLabel();
    const $title = $('<div>').addClass('tilemap-legend-title').text(titleText);
    jqueryDiv.append($title);

    this._legendColors.forEach((color) => {

      const labelText = this._legendQuantizer
        .invertExtent(color)
        .map(this._valueFormatter)
        .join(' – ');

      const label = $('<div>');
      const icon = $('<i>').css({
        background: color,
        'border-color': makeColorDarker(color)
      });

      const text = $('<span>').text(labelText);
      label.append(icon);
      label.append(text);

      jqueryDiv.append(label);
    });
  }

  _makeEmptyStyleFunction() {

    const emptyStyle = _.assign({}, EMPTY_STYLE, {
      weight: this._lineWeight
    });

    return () => {
      return emptyStyle;
    };
  }

  _makeChoroplethStyler() {
    const emptyStyle = this._makeEmptyStyleFunction();
    if (this._metrics.length === 0) {
      return {
        leafletStyleFunction: () => {
          return emptyStyle();
        },
        getMismatches: () => {
          return [];
        },
        getLeafletBounds: () => {
          return null;
        }
      };
    }

    const { min, max } = getMinMax(this._metrics);

    const boundsOfAllFeatures = new L.LatLngBounds();
    return {
      leafletStyleFunction: (geojsonFeature) => {
        const match = geojsonFeature.__kbnJoinedMetric;
        if (!match) {
          return emptyStyle();
        }
        const boundsOfFeature = L.geoJson(geojsonFeature).getBounds();
        boundsOfAllFeatures.extend(boundsOfFeature);

        return {
          fillColor: getChoroplethColor(match.value, min, max, this._colorRamp),
          weight: this._lineWeight,
          opacity: 1,
          color: 'white',
          fillOpacity: 0.7
        };
      },
      /**
       * should not be called until getLeafletStyleFunction has been called
       * @return {Array}
       */
      getMismatches: () => {
        const mismatches = this._metrics.slice();
        this._sortedFeatures.forEach((feature) => {
          const index = mismatches.indexOf(feature.__kbnJoinedMetric);
          if (index >= 0) {
            mismatches.splice(index, 1);
          }
        });
        return mismatches.map(b => b.term);
      },
      getLeafletBounds: function () {
        return boundsOfAllFeatures.isValid() ? boundsOfAllFeatures : null;
      }
    };

  }

}

//lexographic compare
function compareLexographically(termA, termB) {
  termA = typeof termA === 'string' ? termA : termA.toString();
  termB = typeof termB === 'string' ? termB : termB.toString();
  return termA.localeCompare(termB);
}

function makeColorDarker(color) {
  const amount = 1.3;//magic number, carry over from earlier
  return d3.hcl(color).darker(amount).toString();
}


function getMinMax(data) {
  let min = data[0].value;
  let max = data[0].value;
  for (let i = 1; i < data.length; i += 1) {
    min = Math.min(data[i].value, min);
    max = Math.max(data[i].value, max);
  }
  return { min, max };
}

function getLegendColors(colorRamp) {
  const colors = [];
  colors[0] = getColor(colorRamp, 0);
  colors[1] = getColor(colorRamp, Math.floor(colorRamp.length * 1 / 4));
  colors[2] = getColor(colorRamp, Math.floor(colorRamp.length * 2 / 4));
  colors[3] = getColor(colorRamp, Math.floor(colorRamp.length * 3 / 4));
  colors[4] = getColor(colorRamp, colorRamp.length - 1);
  return colors;
}

function getColor(colorRamp, i) {

  if (!colorRamp[i]) {
    return getColor();
  }

  const color = colorRamp[i][1];
  const red = Math.floor(color[0] * 255);
  const green = Math.floor(color[1] * 255);
  const blue = Math.floor(color[2] * 255);
  return `rgb(${red},${green},${blue})`;
}


function getChoroplethColor(value, min, max, colorRamp) {
  if (min === max) {
    return getColor(colorRamp, colorRamp.length - 1);
  }
  const fraction = (value - min) / (max - min);
  const index = Math.round(colorRamp.length * fraction) - 1;
  const i = Math.max(Math.min(colorRamp.length - 1, index), 0);

  return getColor(colorRamp, i);
}



