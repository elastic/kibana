import $ from 'jquery';
import L from 'leaflet';
import _ from 'lodash';
import KibanaMapLayer from 'ui/vis_maps/kibana_map_layer';
import colorramps from 'ui/vislib/components/color/colormaps';

export default class ChoroplethLayer extends KibanaMapLayer {

  constructor(geojsonUrl) {
    super();

    this._metrics = null;
    this._joinField = null;
    this._colorRamp = colorramps['Yellow to Red'];
    this._tooltipFormatter = x => '';

    this._geojsonUrl = geojsonUrl;
    this._leafletLayer = L.geoJson(null, {
      onEachFeature: (feature, layer) => {

        layer.on('click', () => {
          this.emit('select', feature.properties[this._joinField]);
        });
        let location = null;
        const popup = layer.on({
          mouseover: (event) => {

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
      style: emptyStyle
    });

    this._loaded = false;
    $.ajax({//todo: replace with es6 fetch
      dataType: 'json',
      url: geojsonUrl,
      success: (data) => {
        this._leafletLayer.addData(data);
        this._loaded = true;
        this._setChoroplethStyle();
      }
    }).error(function (e) {
      // notifier.fatal(e);
      // console.error(e);
    });
  }

  _setChoroplethStyle() {
    if (!this._loaded || !this._metrics || !this._joinField) {
      return;
    }
    const styleFunction = makeChoroplethStyleFunction(this._metrics, this._colorRamp, this._joinField);
    this._leafletLayer.setStyle(styleFunction);
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
    this._setChoroplethStyle();
  }


  setMetrics(metrics) {
    this._metrics = metrics;
    this._setChoroplethStyle();
  }

  setColorRamp(colorRamp) {
    if (_.isEqual(colorRamp, this._colorRamp)) {
      return;
    }
    this._colorRamp = colorRamp;
    this._setChoroplethStyle();
  }

  equalsGeoJsonUrl(geojsonUrl) {
    return this._geojsonUrl === geojsonUrl;
  }


}

function makeChoroplethStyleFunction(data, colorramp, joinField) {

  if (data.length === 0) {
    return function () {
      return emptyStyle();
    };
  }

  let min = data[0].value;
  let max = data[0].value;
  for (let i = 1; i < data.length; i += 1) {
    min = Math.min(data[i].value, min);
    max = Math.max(data[i].value, max);
  }

  return function (geojsonFeature) {

    const match = data.find((bucket) => {
      return bucket.term === geojsonFeature.properties[joinField];
    });

    if (!match) {
      return emptyStyle();
    }

    return {
      fillColor: getChoroplethColor(match.value, min, max, colorramp),
      weight: 2,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };
}

function getChoroplethColor(value, min, max, colorRamp) {
  if (min === max) {
    return colorRamp[colorRamp.length - 1];
  }
  const fraction = (value - min) / (max - min);
  const index = Math.round(colorRamp.length * fraction) - 1;
  const i = Math.max(Math.min(colorRamp.length - 1, index), 0);

  const color = colorRamp[i][1];
  const red = Math.floor(color[0] * 255);
  const green = Math.floor(color[1] * 255);
  const blue = Math.floor(color[2] * 255);
  return `rgb(${red},${green},${blue})`;
}


const emptyStyleObject = {
  weight: 1,
  opacity: 0.6,
  color: 'rgb(200,200,200)',
  fillOpacity: 0
};
function emptyStyle() {
  return emptyStyleObject;
}

