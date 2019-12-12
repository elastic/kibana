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

import { EventEmitter } from 'events';
import { createZoomWarningMsg } from './map_messages';
import L from 'leaflet';
import $ from 'jquery';
import _ from 'lodash';
import { zoomToPrecision } from './zoom_to_precision';
import { i18n } from '@kbn/i18n';
import { ORIGIN } from '../../../../core_plugins/tile_map/common/origin';

function makeFitControl(fitContainer, kibanaMap) {

  const FitControl = L.Control.extend({
    options: {
      position: 'topleft'
    },
    initialize: function (fitContainer, kibanaMap) {
      this._fitContainer = fitContainer;
      this._kibanaMap = kibanaMap;
      this._leafletMap = null;
    },
    onAdd: function (leafletMap) {
      this._leafletMap = leafletMap;
      const fitDatBoundsLabel = i18n.translate('common.ui.vis.kibanaMap.leaflet.fitDataBoundsAriaLabel',
        { defaultMessage: 'Fit Data Bounds' });
      $(this._fitContainer).html(`<a class="kuiIcon fa-crop" href="#" title="${fitDatBoundsLabel}" aria-label="${fitDatBoundsLabel}"></a>`)
        .on('click', e => {
          e.preventDefault();
          this._kibanaMap.fitToData();
        });

      return this._fitContainer;
    },
    onRemove: function () {
      $(this._fitContainer).off('click');
    }
  });

  return new FitControl(fitContainer, kibanaMap);
}

function makeLegendControl(container, kibanaMap, position) {

  const LegendControl = L.Control.extend({

    options: {
      position: 'topright'
    },

    initialize: function (container, kibanaMap, position) {
      this._legendContainer = container;
      this._kibanaMap = kibanaMap;
      this.options.position = position;

    },

    updateContents() {
      this._legendContainer.empty();
      const $div = $('<div>').addClass('visMapLegend');
      this._legendContainer.append($div);
      const layers = this._kibanaMap.getLayers();
      layers.forEach((layer) =>layer.appendLegendContents($div));
    },


    onAdd: function () {
      this._layerUpdateHandle = () => this.updateContents();
      this._kibanaMap.on('layers:update', this._layerUpdateHandle);
      this.updateContents();
      return this._legendContainer.get(0);
    },
    onRemove: function () {
      this._kibanaMap.removeListener('layers:update', this._layerUpdateHandle);
      this._legendContainer.empty();
    }

  });

  return new LegendControl(container, kibanaMap, position);
}

/**
 * Collects map functionality required for Kibana.
 * Serves as simple abstraction for leaflet as well.
 */
export class KibanaMap extends EventEmitter {

  constructor(containerNode, options) {

    super();
    this._containerNode = containerNode;
    this._leafletBaseLayer = null;
    this._baseLayerSettings = null;
    this._baseLayerIsDesaturated = true;

    this._leafletDrawControl = null;
    this._leafletFitControl = null;
    this._leafletLegendControl = null;
    this._legendPosition = 'topright';

    this._layers = [];
    this._listeners = [];
    this._showTooltip = false;

    const leafletOptions = {
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
      center: options.center ? options.center : [0, 0],
      zoom: options.zoom ? options.zoom : 2,
      renderer: L.canvas(),
      zoomAnimation: false, // Desaturate map tiles causes animation rendering artifacts
      zoomControl: options.zoomControl === undefined ? true : options.zoomControl,
    };

    this._leafletMap = L.map(containerNode, leafletOptions);
    this._leafletMap.attributionControl.setPrefix('');

    if (!options.scrollWheelZoom) {
      this._leafletMap.scrollWheelZoom.disable();
    }

    let previousZoom = this._leafletMap.getZoom();
    this._leafletMap.on('zoomend', () => {
      if (previousZoom !== this._leafletMap.getZoom()) {
        previousZoom = this._leafletMap.getZoom();
        this.emit('zoomchange');
      }
    });
    this._leafletMap.on('zoomend', () => this.emit('zoomend'));
    this._leafletMap.on('dragend', () => this.emit('dragend'));

    this._leafletMap.on('zoomend', () => this._updateExtent());
    this._leafletMap.on('dragend', () => this._updateExtent());

    this._leafletMap.on('mousemove', e => this._layers.forEach(layer => layer.movePointer('mousemove', e)));
    this._leafletMap.on('mouseout', e => this._layers.forEach(layer => layer.movePointer('mouseout', e)));
    this._leafletMap.on('mousedown', e => this._layers.forEach(layer => layer.movePointer('mousedown', e)));
    this._leafletMap.on('mouseup', e => this._layers.forEach(layer => layer.movePointer('mouseup', e)));
    this._leafletMap.on('draw:created', event => {
      const drawType = event.layerType;
      if (drawType === 'rectangle') {
        const bounds = event.layer.getBounds();

        const southEast = bounds.getSouthEast();
        const northWest = bounds.getNorthWest();
        let southEastLng = southEast.lng;
        if (southEastLng > 180) {
          southEastLng -= 360;
        }
        let northWestLng = northWest.lng;
        if (northWestLng < -180) {
          northWestLng += 360;
        }

        const southEastLat = southEast.lat;
        const northWestLat = northWest.lat;

        //Bounds cannot be created unless they form a box with larger than 0 dimensions
        //Invalid areas are rejected by ES.
        if (southEastLat === northWestLat || southEastLng === northWestLng) {
          return;
        }

        this.emit('drawCreated:rectangle', {
          bounds: {
            bottom_right: {
              lat: southEastLat,
              lon: southEastLng
            },
            top_left: {
              lat: northWestLat,
              lon: northWestLng
            }
          }
        });
      } else if (drawType === 'polygon') {
        const latLongs = event.layer.getLatLngs()[0];
        this.emit('drawCreated:polygon', {
          points: latLongs.map(leafletLatLng => {
            return {
              lat: leafletLatLng.lat,
              lon: leafletLatLng.lng
            };
          })
        });
      }
    });

    this.resize();
  }

  setShowTooltip(showTooltip) {
    this._showTooltip = showTooltip;
  }

  getLayers() {
    return this._layers.slice();
  }


  addLayer(kibanaLayer) {


    const onshowTooltip = (event) => {

      if (!this._showTooltip) {
        return;
      }

      if (!this._popup) {
        this._popup = L.responsivePopup({ autoPan: false });
        this._popup.setLatLng(event.position);
        this._popup.setContent(event.content);
        this._popup.openOn(this._leafletMap);
      } else {
        if (!this._popup.getLatLng().equals(event.position)) {
          this._popup.setLatLng(event.position);
        }
        if (this._popup.getContent() !== event.content) {
          this._popup.setContent(event.content);
        }
      }

    };

    kibanaLayer.on('showTooltip', onshowTooltip);
    this._listeners.push({ name: 'showTooltip', handle: onshowTooltip, layer: kibanaLayer });

    const onHideTooltip = () => {
      this._leafletMap.closePopup();
      this._popup = null;
    };
    kibanaLayer.on('hideTooltip', onHideTooltip);
    this._listeners.push({ name: 'hideTooltip', handle: onHideTooltip, layer: kibanaLayer });


    const onStyleChanged = () => {
      if (this._leafletLegendControl) {
        this._leafletLegendControl.updateContents();
      }
    };
    kibanaLayer.on('styleChanged', onStyleChanged);
    this._listeners.push({ name: 'styleChanged', handle: onStyleChanged, layer: kibanaLayer });

    this._layers.push(kibanaLayer);
    kibanaLayer.addToLeafletMap(this._leafletMap);
    this.emit('layers:update');

    this._addAttributions(kibanaLayer.getAttributions());
  }

  removeLayer(kibanaLayer) {

    if (!kibanaLayer) {
      return;
    }

    this._removeAttributions(kibanaLayer.getAttributions());
    const index = this._layers.indexOf(kibanaLayer);
    if (index >= 0) {
      this._layers.splice(index, 1);
      kibanaLayer.removeFromLeafletMap(this._leafletMap);
    }
    this._listeners.forEach(listener => {
      if (listener.layer === kibanaLayer) {
        listener.layer.removeListener(listener.name, listener.handle);
      }
    });

    //must readd all attributions, because we might have removed dupes
    this._layers.forEach((layer) => this._addAttributions(layer.getAttributions()));
    if (this._baseLayerSettings) {
      this._addAttributions(this._baseLayerSettings.options.attribution);
    }
  }


  _addAttributions(attribution) {
    const attributions = getAttributionArray(attribution);
    attributions.forEach((attribution) => {
      this._leafletMap.attributionControl.removeAttribution(attribution);//this ensures we do not add duplicates
      this._leafletMap.attributionControl.addAttribution(attribution);
    });
  }

  _removeAttributions(attribution) {
    const attributions = getAttributionArray(attribution);
    attributions.forEach((attribution) => {
      this._leafletMap.attributionControl.removeAttribution(attribution);//this ensures we do not add duplicates
    });
  }

  destroy() {
    if (this._leafletFitControl) {
      this._leafletMap.removeControl(this._leafletFitControl);
    }
    if (this._leafletDrawControl) {
      this._leafletMap.removeControl(this._leafletDrawControl);
    }
    if (this._leafletLegendControl) {
      this._leafletMap.removeControl(this._leafletLegendControl);
    }
    this.setBaseLayer(null);
    let layer;
    while (this._layers.length) {
      layer = this._layers.pop();
      layer.removeFromLeafletMap(this._leafletMap);
    }
    this._leafletMap.remove();
    this._containerNode.innerHTML = '';
    this._listeners.forEach(listener => listener.layer.removeListener(listener.name, listener.handle));
  }

  getCenter() {
    const center = this._leafletMap.getCenter();
    return { lon: center.lng, lat: center.lat };
  }

  setCenter(latitude, longitude) {
    const latLong = L.latLng(latitude, longitude);
    if (latLong.equals && !latLong.equals(this._leafletMap.getCenter())) {
      this._leafletMap.setView(latLong);
    }
  }

  setZoomLevel(zoomLevel) {
    if (this._leafletMap.getZoom() !== zoomLevel) {
      this._leafletMap.setZoom(zoomLevel);
    }
  }

  getZoomLevel = () => {
    return this._leafletMap.getZoom();
  }

  getMaxZoomLevel = () => {
    return this._leafletMap.getMaxZoom();
  }

  getGeohashPrecision() {
    return zoomToPrecision(this._leafletMap.getZoom(), 12, this._leafletMap.getMaxZoom());
  }

  getLeafletBounds() {
    return this._leafletMap.getBounds();
  }

  getMetersPerPixel() {
    const pointC = this._leafletMap.latLngToContainerPoint(this._leafletMap.getCenter()); // center (pixels)
    const pointX = [pointC.x + 1, pointC.y]; // add one pixel to x
    const pointY = [pointC.x, pointC.y + 1]; // add one pixel to y

    const latLngC = this._leafletMap.containerPointToLatLng(pointC);
    const latLngX = this._leafletMap.containerPointToLatLng(pointX);
    const latLngY = this._leafletMap.containerPointToLatLng(pointY);

    const distanceX = latLngC.distanceTo(latLngX); // calculate distance between c and x (latitude)
    const distanceY = latLngC.distanceTo(latLngY); // calculate distance between c and y (longitude)
    return _.min([distanceX, distanceY]);
  }

  _getLeafletBounds(resizeOnFail) {

    const boundsRaw = this._leafletMap.getBounds();
    const bounds = this._leafletMap.wrapLatLngBounds(boundsRaw);

    if (!bounds) {
      return null;
    }

    const southEast = bounds.getSouthEast();
    const northWest = bounds.getNorthWest();
    if (
      southEast.lng === northWest.lng ||
      southEast.lat === northWest.lat
    ) {
      if (resizeOnFail) {
        this._leafletMap.invalidateSize();
        return this._getLeafletBounds(false);
      } else {
        return null;
      }
    } else {
      return bounds;
    }
  }

  getBounds() {

    const bounds = this._getLeafletBounds(true);
    if (!bounds) {
      return null;
    }

    const southEast = bounds.getSouthEast();
    const northWest = bounds.getNorthWest();

    const southEastLng = southEast.lng;
    const northWestLng = northWest.lng;
    const southEastLat = southEast.lat;
    const northWestLat = northWest.lat;

    // When map has not width or height, the map has no dimensions.
    // These dimensions are enforced due to CSS style rules that enforce min-width/height of 0
    // that enforcement also resolves errors with the heatmap layer plugin.

    return {
      bottom_right: {
        lat: southEastLat,
        lon: southEastLng
      },
      top_left: {
        lat: northWestLat,
        lon: northWestLng
      }
    };
  }

  setDesaturateBaseLayer(isDesaturated) {
    if (isDesaturated === this._baseLayerIsDesaturated) {
      return;
    }
    this._baseLayerIsDesaturated = isDesaturated;
    this._updateDesaturation();
    if (this._leafletBaseLayer) {
      this._leafletBaseLayer.redraw();
    }
  }

  addDrawControl() {
    const drawColor = '#000';
    const drawOptions = {
      draw: {
        polyline: false,
        marker: false,
        circle: false,
        rectangle: {
          shapeOptions: {
            stroke: false,
            color: drawColor
          }
        },
        polygon: {
          shapeOptions: {
            color: drawColor
          }
        },
        circlemarker: false
      }
    };
    this._leafletDrawControl = new L.Control.Draw(drawOptions);
    this._leafletMap.addControl(this._leafletDrawControl);
  }

  addFitControl() {

    if (this._leafletFitControl || !this._leafletMap) {
      return;
    }

    const fitContainer = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-fit');
    this._leafletFitControl = makeFitControl(fitContainer, this);
    this._leafletMap.addControl(this._leafletFitControl);
  }

  addLegendControl() {
    if (this._leafletLegendControl || !this._leafletMap) {
      return;
    }
    this._updateLegend();
  }

  _addMaxZoomMessage = layer => {
    const zoomWarningMsg = createZoomWarningMsg(this.getZoomLevel, this.getMaxZoomLevel);

    this._leafletMap.on('zoomend', zoomWarningMsg);
    this._containerNode.setAttribute('data-test-subj', 'zoomWarningEnabled');

    layer.on('remove', () => {
      this._leafletMap.off('zoomend', zoomWarningMsg);
      this._containerNode.removeAttribute('data-test-subj');
    });
  }

  setLegendPosition(position) {
    if (this._legendPosition === position) {
      if (!this._leafletLegendControl) {
        this._updateLegend();
      }
    } else {
      this._legendPosition = position;
      this._updateLegend();
    }


  }

  _updateLegend() {
    if (this._leafletLegendControl) {
      this._leafletMap.removeControl(this._leafletLegendControl);
    }
    const $wrapper = $('<div>').addClass('visMapLegend__wrapper');
    this._leafletLegendControl = makeLegendControl($wrapper, this, this._legendPosition);
    this._leafletMap.addControl(this._leafletLegendControl);
  }

  resize() {
    this._leafletMap.invalidateSize();
    this._updateExtent();
  }

  setMinZoom(zoom) {
    this._leafletMap.setMinZoom(zoom);
  }

  setMaxZoom(zoom) {
    this._leafletMap.setMaxZoom(zoom);
  }

  getLeafletBaseLayer() {
    return this._leafletBaseLayer;
  }

  setBaseLayer(settings) {

    if (_.isEqual(settings, this._baseLayerSettings)) {
      return;
    }


    if (settings === null) {
      if (this._leafletBaseLayer && this._leafletMap) {
        this._removeAttributions(this._baseLayerSettings.options.attribution);
        this._leafletMap.removeLayer(this._leafletBaseLayer);
        this._leafletBaseLayer = null;
        this._baseLayerSettings = null;
      }
      return;
    }

    this._baseLayerSettings = settings;
    if (this._leafletBaseLayer) {
      this._leafletMap.removeLayer(this._leafletBaseLayer);
      this._leafletBaseLayer = null;
    }

    let baseLayer;
    if (settings.baseLayerType === 'wms') {
      //This is user-input that is rendered with the Leaflet attribution control. Needs to be sanitized.
      this._baseLayerSettings.options.attribution = _.escape(settings.options.attribution);
      baseLayer = this._getWMSBaseLayer(settings.options);
    } else if (settings.baseLayerType === 'tms') {
      baseLayer = this._getTMSBaseLayer((settings.options));
    }

    if (baseLayer) {
      baseLayer.on('tileload', () => this._updateDesaturation());
      baseLayer.on('load', () => {
        this.emit('baseLayer:loaded');
      });
      baseLayer.on('loading', () => {
        this.emit('baseLayer:loading');
      });

      this._leafletBaseLayer = baseLayer;
      if (settings.options.showZoomMessage) {
        baseLayer.on('add', () => {
          this._addMaxZoomMessage(baseLayer);
        });
      }
      this._leafletBaseLayer.addTo(this._leafletMap);
      this._leafletBaseLayer.bringToBack();
      if (settings.options.minZoom > this._leafletMap.getZoom()) {
        this._leafletMap.setZoom(settings.options.minZoom);
      }
      this._addAttributions(settings.options.attribution);
      this.resize();
    }

  }

  isInside(bucketRectBounds) {
    const mapBounds = this._leafletMap.getBounds();
    return mapBounds.intersects(bucketRectBounds);
  }

  async fitToData() {

    if (!this._leafletMap) {
      return;
    }

    const boundsArray = await Promise.all(this._layers.map(async (layer) => {
      return await layer.getBounds();
    }));

    let bounds = null;
    boundsArray.forEach(async (b) => {
      if (bounds) {
        bounds.extend(b);
      } else {
        bounds = b;
      }
    });

    if (bounds && bounds.isValid()) {
      this._leafletMap.fitBounds(bounds);
    }
  }

  _getTMSBaseLayer(options) {
    return L.tileLayer(options.url, {
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
      subdomains: options.subdomains || []
    });
  }

  _getWMSBaseLayer(options) {
    const wmsOptions = {
      format: options.format || '',
      layers: options.layers || '',
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
      styles: options.styles || '',
      transparent: options.transparent,
      version: options.version || '1.3.0'
    };

    return (typeof options.url === 'string' && options.url.length) ? L.tileLayer.wms(options.url, wmsOptions) : null;
  }

  _updateExtent() {
    this._layers.forEach(layer => layer.updateExtent());
  }

  _updateDesaturation() {
    const tiles = $('img.leaflet-tile-loaded');
    // Don't apply client-side styling to EMS basemaps
    if (_.get(this._baseLayerSettings, 'options.origin') === ORIGIN.EMS) {
      tiles.addClass('filters-off');
    } else {
      if (this._baseLayerIsDesaturated) {
        tiles.removeClass('filters-off');
      } else if (!this._baseLayerIsDesaturated) {
        tiles.addClass('filters-off');
      }
    }
  }

  persistUiStateForVisualization(visualization) {
    function persistMapStateInUiState() {
      const uiState = visualization.getUiState();
      const centerFromUIState = uiState.get('mapCenter');
      const zoomFromUiState = parseInt(uiState.get('mapZoom'));

      if (isNaN(zoomFromUiState) || this.getZoomLevel() !== zoomFromUiState) {
        visualization.uiStateVal('mapZoom', this.getZoomLevel());
      }
      const centerFromMap = this.getCenter();
      if (!centerFromUIState || centerFromMap.lon !== centerFromUIState[1] || centerFromMap.lat !== centerFromUIState[0]) {
        visualization.uiStateVal('mapCenter', [centerFromMap.lat, centerFromMap.lon]);
      }
    }

    this._leafletMap.on('resize', () => {
      visualization.sessionState.mapBounds = this.getBounds();
    });
    this._leafletMap.on('load', () => {
      visualization.sessionState.mapBounds = this.getBounds();
    });
    this.on('dragend', persistMapStateInUiState);
    this.on('zoomend', persistMapStateInUiState);
  }

  useUiStateFromVisualization(visualization) {
    const uiState = visualization.getUiState();
    const zoomFromUiState = parseInt(uiState.get('mapZoom'));
    const centerFromUIState = uiState.get('mapCenter');
    if (!isNaN(zoomFromUiState)) {
      this.setZoomLevel(zoomFromUiState);
    }
    if (centerFromUIState) {
      this.setCenter(centerFromUIState[0], centerFromUIState[1]);
    }
  }
}


function getAttributionArray(attribution) {
  const attributionString = attribution || '';
  let attributions = attributionString.split(/\s*\|\s*/);
  if (attributions.length === 1) {//temp work-around due to inconsistency in manifests of how attributions are delimited
    attributions = attributions[0].split(',');
  }
  return attributions;
}

