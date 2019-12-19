/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import $ from 'jquery';
import L from 'leaflet';
import _ from 'lodash';
import d3 from 'd3';
import { i18n } from '@kbn/i18n';
import { KibanaMapLayer } from 'ui/vis/map/kibana_map_layer';
import { truncatedColorMaps } from 'ui/color_maps';
import * as topojson from 'topojson-client';
import { toastNotifications } from 'ui/notify';
import * as colorUtil from 'ui/vis/map/color_util';

const EMPTY_STYLE = {
  weight: 1,
  opacity: 0.6,
  color: 'rgb(200,200,200)',
  fillOpacity: 0,
};

export default class ChoroplethLayer extends KibanaMapLayer {
  static _doInnerJoin(sortedMetrics, sortedGeojsonFeatures, joinField) {
    let j = 0;
    for (let i = 0; i < sortedGeojsonFeatures.length; i++) {
      const property = sortedGeojsonFeatures[i].properties[joinField];
      sortedGeojsonFeatures[i].__kbnJoinedMetric = null;
      const position = sortedMetrics.length
        ? compareLexicographically(property, sortedMetrics[j].term)
        : -1;
      if (position === -1) {
        //just need to cycle on
      } else if (position === 0) {
        sortedGeojsonFeatures[i].__kbnJoinedMetric = sortedMetrics[j];
      } else if (position === 1) {
        //needs to catch up
        while (j < sortedMetrics.length) {
          const newTerm = sortedMetrics[j].term;
          const newPosition = compareLexicographically(newTerm, property);
          if (newPosition === -1) {
            //not far enough
          } else if (newPosition === 0) {
            sortedGeojsonFeatures[i].__kbnJoinedMetric = sortedMetrics[j];
            break;
          } else if (newPosition === 1) {
            //too far!
            break;
          }
          if (j === sortedMetrics.length - 1) {
            //always keep a reference to the last metric
            break;
          } else {
            j++;
          }
        }
      }
    }
  }

  constructor(name, attribution, format, showAllShapes, meta, layerConfig, serviceSettings) {
    super();
    this._serviceSettings = serviceSettings;
    this._metrics = null;
    this._joinField = null;
    this._colorRamp = truncatedColorMaps[Object.keys(truncatedColorMaps)[0]].value;
    this._lineWeight = 1;
    this._tooltipFormatter = () => '';
    this._attribution = attribution;
    this._boundsOfData = null;
    this._showAllShapes = showAllShapes;
    this._layerName = name;
    this._layerConfig = layerConfig;

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
              const leafletGeojson = L.geoJson(feature);
              location = leafletGeojson.getBounds().getCenter();
            }
            this.emit('showTooltip', {
              content: tooltipContents,
              position: location,
            });
          },
          mouseout: () => {
            this.emit('hideTooltip');
          },
        });
      },
      style: this._makeEmptyStyleFunction(),
    });

    this._loaded = false;
    this._error = false;
    this._isJoinValid = false;
    this._whenDataLoaded = new Promise(async resolve => {
      try {
        const data = await this._makeJsonAjaxCall();
        let featureCollection;
        let formatType;
        if (typeof format === 'string') {
          formatType = format;
        } else if (format && format.type) {
          formatType = format.type;
        } else {
          formatType = 'geojson';
        }

        if (formatType === 'geojson') {
          featureCollection = data;
        } else if (formatType === 'topojson') {
          const features = _.get(data, 'objects.' + meta.feature_collection_path);
          featureCollection = topojson.feature(data, features); //conversion to geojson
        } else {
          //should never happen
          throw new Error(
            i18n.translate('regionMap.choroplethLayer.unrecognizedFormatErrorMessage', {
              defaultMessage: 'Unrecognized format {formatType}',
              values: { formatType },
            })
          );
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
          errorMessage = i18n.translate(
            'regionMap.choroplethLayer.downloadingVectorData404ErrorMessage',
            {
              defaultMessage:
                "Server responding with '404' when attempting to fetch {name}. \
Make sure the file exists at that location.",
              values: { name: name },
            }
          );
        } else {
          errorMessage = i18n.translate(
            'regionMap.choroplethLayer.downloadingVectorDataErrorMessage',
            {
              defaultMessage:
                'Cannot download {name} file. Please ensure the \
CORS configuration of the server permits requests from the Kibana application on this host.',
              values: { name: name },
            }
          );
        }

        toastNotifications.addDanger({
          title: i18n.translate(
            'regionMap.choroplethLayer.downloadingVectorDataErrorMessageTitle',
            {
              defaultMessage: 'Error downloading vector data',
            }
          ),
          text: errorMessage,
        });

        resolve();
      }
    });
  }

  //This method is stubbed in the tests to avoid network request during unit tests.
  async _makeJsonAjaxCall() {
    return this._serviceSettings.getJsonForRegionLayer(this._layerConfig);
  }

  _invalidateJoin() {
    this._isJoinValid = false;
  }

  _doInnerJoin() {
    ChoroplethLayer._doInnerJoin(this._metrics, this._sortedFeatures, this._joinField);
    this._isJoinValid = true;
  }

  _setStyle() {
    if (this._error || !this._loaded || !this._metrics || !this._joinField) {
      return;
    }

    if (!this._isJoinValid) {
      this._doInnerJoin();
      if (!this._showAllShapes) {
        const featureCollection = {
          type: 'FeatureCollection',
          features: this._sortedFeatures.filter(feature => feature.__kbnJoinedMetric),
        };
        this._leafletLayer.addData(featureCollection);
      }
    }

    const styler = this._makeChoroplethStyler();
    this._leafletLayer.setStyle(styler.leafletStyleFunction);

    if (this._metrics && this._metrics.length > 0) {
      const { min, max } = getMinMax(this._metrics);
      this._legendColors = colorUtil.getLegendColors(this._colorRamp);
      const quantizeDomain = min !== max ? [min, max] : d3.scale.quantize().domain();
      this._legendQuantizer = d3.scale
        .quantize()
        .domain(quantizeDomain)
        .range(this._legendColors);
    }
    this._boundsOfData = styler.getLeafletBounds();
    this.emit('styleChanged', {
      mismatches: styler.getMismatches(),
    });
  }

  getUrl() {
    return this._layerName;
  }

  setTooltipFormatter(tooltipFormatter, fieldFormatter, fieldName, metricLabel) {
    this._tooltipFormatter = geojsonFeature => {
      if (!this._metrics) {
        return '';
      }
      const match = this._metrics.find(bucket => {
        return (
          compareLexicographically(bucket.term, geojsonFeature.properties[this._joinField]) === 0
        );
      });
      return tooltipFormatter(match, fieldFormatter, fieldName, metricLabel);
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

  cloneChoroplethLayerForNewData(
    name,
    attribution,
    format,
    showAllData,
    meta,
    layerConfig,
    serviceSettings
  ) {
    const clonedLayer = new ChoroplethLayer(
      name,
      attribution,
      format,
      showAllData,
      meta,
      layerConfig,
      serviceSettings
    );
    clonedLayer.setJoinField(this._joinField);
    clonedLayer.setColorRamp(this._colorRamp);
    clonedLayer.setLineWeight(this._lineWeight);
    clonedLayer.setTooltipFormatter(this._tooltipFormatter);
    if (this._metrics) {
      clonedLayer.setMetrics(this._metrics, this._valueFormatter, this._metricTitle);
    }
    return clonedLayer;
  }

  _sortFeatures() {
    if (this._sortedFeatures && this._joinField) {
      this._sortedFeatures.sort((a, b) => {
        const termA = a.properties[this._joinField];
        const termB = b.properties[this._joinField];
        return compareLexicographically(termA, termB);
      });
      this._invalidateJoin();
    }
  }

  whenDataLoaded() {
    return this._whenDataLoaded;
  }

  setMetrics(metrics, fieldFormatter, metricTitle) {
    this._metrics = metrics.slice();
    this._valueFormatter = fieldFormatter;
    this._metricTitle = metricTitle;

    this._metrics.sort((a, b) => compareLexicographically(a.term, b.term));
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

  canReuseInstance(name, showAllShapes) {
    return this._layerName === name && this._showAllShapes === showAllShapes;
  }

  canReuseInstanceForNewMetrics(name, showAllShapes, newMetrics) {
    if (this._layerName !== name) {
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
    return this._boundsOfData ? this._boundsOfData : bounds;
  }

  appendLegendContents(jqueryDiv) {
    if (!this._legendColors || !this._legendQuantizer) {
      return;
    }

    const titleText = this._metricTitle;
    const $title = $('<div>')
      .addClass('visMapLegend__title')
      .text(titleText);
    jqueryDiv.append($title);

    this._legendColors.forEach(color => {
      const labelText = this._legendQuantizer
        .invertExtent(color)
        .map(val => {
          return this._valueFormatter.convert(val);
        })
        .join(' – ');

      const label = $('<div>');
      const icon = $('<i>').css({
        background: color,
        'border-color': makeColorDarker(color),
      });

      const text = $('<span>').text(labelText);
      label.append(icon);
      label.append(text);

      jqueryDiv.append(label);
    });
  }

  _makeEmptyStyleFunction() {
    const emptyStyle = _.assign({}, EMPTY_STYLE, {
      weight: this._lineWeight,
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
        },
      };
    }

    const { min, max } = getMinMax(this._metrics);

    const boundsOfAllFeatures = new L.LatLngBounds();
    return {
      leafletStyleFunction: geojsonFeature => {
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
          fillOpacity: 0.7,
        };
      },
      /**
       * should not be called until getLeafletStyleFunction has been called
       * @return {Array}
       */
      getMismatches: () => {
        const mismatches = this._metrics.slice();
        this._sortedFeatures.forEach(feature => {
          const index = mismatches.indexOf(feature.__kbnJoinedMetric);
          if (index >= 0) {
            mismatches.splice(index, 1);
          }
        });
        return mismatches.map(b => b.term);
      },
      getLeafletBounds: function() {
        return boundsOfAllFeatures.isValid() ? boundsOfAllFeatures : null;
      },
    };
  }
}

//lexicographic compare
function compareLexicographically(termA, termB) {
  termA = typeof termA === 'string' ? termA : termA.toString();
  termB = typeof termB === 'string' ? termB : termB.toString();
  return termA.localeCompare(termB);
}

function makeColorDarker(color) {
  const amount = 1.3; //magic number, carry over from earlier
  return d3
    .hcl(color)
    .darker(amount)
    .toString();
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

function getChoroplethColor(value, min, max, colorRamp) {
  if (min === max) {
    return colorUtil.getColor(colorRamp, colorRamp.length - 1);
  }
  const fraction = (value - min) / (max - min);
  const index = Math.round(colorRamp.length * fraction) - 1;
  const i = Math.max(Math.min(colorRamp.length - 1, index), 0);

  return colorUtil.getColor(colorRamp, i);
}
