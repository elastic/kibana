import L from 'leaflet';
import _ from 'lodash';

import { KibanaMapLayer } from 'ui/vis/map/kibana_map_layer';
import { HeatmapMarkers } from './markers/heatmap';
import { ScaledCirclesMarkers } from './markers/scaled_circles';
import { ShadedCirclesMarkers } from './markers/shaded_circles';
import { GeohashGridMarkers } from './markers/geohash_grid';

export class GeohashLayer extends KibanaMapLayer {

  constructor(featureCollection, featureCollectionMetaData, options, zoom, kibanaMap) {

    super();

    this._featureCollection = featureCollection;
    this._featureCollectionMetaData = featureCollectionMetaData;

    this._geohashOptions = options;
    this._zoom = zoom;
    this._kibanaMap = kibanaMap;
    const geojson = L.geoJson(this._featureCollection);
    this._bounds = geojson.getBounds();
    this._createGeohashMarkers();
    this._lastBounds = null;
  }

  _createGeohashMarkers() {
    const markerOptions = {
      isFilteredByCollar: this._geohashOptions.isFilteredByCollar,
      valueFormatter: this._geohashOptions.valueFormatter,
      tooltipFormatter: this._geohashOptions.tooltipFormatter,
      label: this._geohashOptions.label
    };
    switch (this._geohashOptions.mapType) {
      case 'Scaled Circle Markers':
        this._geohashMarkers = new ScaledCirclesMarkers(this._featureCollection,
          this._featureCollectionMetaData, markerOptions, this._zoom, this._kibanaMap);
        break;
      case 'Shaded Circle Markers':
        this._geohashMarkers = new ShadedCirclesMarkers(this._featureCollection,
          this._featureCollectionMetaData, markerOptions, this._zoom, this._kibanaMap);
        break;
      case 'Shaded Geohash Grid':
        this._geohashMarkers = new GeohashGridMarkers(this._featureCollection,
          this._featureCollectionMetaData, markerOptions, this._zoom, this._kibanaMap);
        break;
      case 'Heatmap':

        let radius = 15;
        if (this._featureCollectionMetaData.geohashGridDimensionsAtEquator) {
          const minGridLength = _.min(this._featureCollectionMetaData.geohashGridDimensionsAtEquator);
          const metersPerPixel = this._kibanaMap.getMetersPerPixel();
          radius = (minGridLength / metersPerPixel) / 2;
        }
        radius = radius * parseFloat(this._geohashOptions.heatmap.heatClusterSize);
        this._geohashMarkers = new HeatmapMarkers(this._featureCollection, {
          radius: radius,
          blur: radius,
          maxZoom: this._kibanaMap.getZoomLevel(),
          minOpacity: 0.1,
          tooltipFormatter: this._geohashOptions.tooltipFormatter
        }, this._zoom, this._featureCollectionMetaData.max);
        break;
      default:
        throw new Error(`${this._geohashOptions.mapType} mapType not recognized`);

    }

    this._geohashMarkers.on('showTooltip', (event) => this.emit('showTooltip', event));
    this._geohashMarkers.on('hideTooltip', (event) => this.emit('hideTooltip', event));
    this._leafletLayer = this._geohashMarkers.getLeafletLayer();
  }

  appendLegendContents(jqueryDiv) {
    return this._geohashMarkers.appendLegendContents(jqueryDiv);
  }

  movePointer(...args) {
    this._geohashMarkers.movePointer(...args);
  }

  async getBounds() {
    if (this._geohashOptions.fetchBounds) {
      const geoHashBounds = await this._geohashOptions.fetchBounds();
      if (geoHashBounds) {
        const northEast = L.latLng(geoHashBounds.top_left.lat, geoHashBounds.bottom_right.lon);
        const southWest = L.latLng(geoHashBounds.bottom_right.lat, geoHashBounds.top_left.lon);
        return L.latLngBounds(southWest, northEast);
      }
    }

    return this._bounds;
  }

  updateExtent() {
    // Client-side filtering is only enabled when server-side filter is not used
    if (!this._geohashOptions.isFilteredByCollar) {
      const bounds = this._kibanaMap.getLeafletBounds();
      if (!this._lastBounds || !this._lastBounds.equals(bounds)) {
        //this removal is required to trigger the bounds filter again
        this._kibanaMap.removeLayer(this);
        this._createGeohashMarkers();
        this._kibanaMap.addLayer(this);
      }
      this._lastBounds = bounds;
    }
  }

  isReusable(options) {

    if (_.isEqual(this._geohashOptions, options)) {
      return true;
    }

    if (this._geohashOptions.mapType !== options.mapType) {
      return false;
    } else if (this._geohashOptions.mapType === 'Heatmap' && !_.isEqual(this._geohashOptions.heatmap, options)) {
      return false;
    } else {
      return true;
    }
  }
}



