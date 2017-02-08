import { EventEmitter } from 'events';
import L from 'leaflet';
import $ from 'jquery';
import Notifier from 'ui/notify/notifier';

const notifier = new Notifier();


function emptyColor() {
  return {
    fillColor: 'rgba(255,255,255,0)',
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0
  };
}
class ChoroplethMap extends EventEmitter {

  constructor(domNode) {
    super();

    this._leafletMap = L.map(domNode, {});
    this._leafletMap.setView([0, 0], 0);

    const self = this;
    this._themeLayer = L.geoJson(null, {
      onEachFeature: function (feature, layer) {
        layer.on('click', function () {
          self.emit('select', feature.properties.iso);
        });
      }
    });
    this._themeLayer.addTo(this._leafletMap);
    this._themeLayer.setStyle(emptyColor);
    this._tileLayer = L.tileLayer('https://c.tile.openstreetmap.org/{z}/{x}/{y}.png', {id: 'osm'});
    this._tileLayer.addTo(this._leafletMap);

    self._loaded = false;
    $.ajax({
      dataType: 'json',
      url: '../plugins/choropleth/data/world_countries.geojson',
      success: function (data) {
        self._themeLayer.addData(data);
        self._loaded = true;
      }
    }).error(function (e) {
      notifier.fatal(e);
    });

  }

  setStyle(styleFunction) {
    this._themeLayer.setStyle(styleFunction);
  }

  resize() {
    this._leafletMap.invalidateSize();
  }

}


// function style(feature) {
//   return {
//     fillColor: getColor(feature.properties.density),
//     weight: 2,
//     opacity: 1,
//     color: 'white',
//     dashArray: '3',
//     fillOpacity: 0.7
//   };
// }

export default ChoroplethMap;
