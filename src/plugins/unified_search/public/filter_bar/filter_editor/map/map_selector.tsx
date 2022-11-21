/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import type { Map as MapboxMap } from '@kbn/mapbox-gl';
import maplibregl from 'maplibre-gl';
import * as topojson from 'topojson-client';
import { Topology } from 'topojson-specification';
import { Feature, Geometry } from 'geojson';
import { DrawFilter } from './draw_filter';
import world from './world.json';

export interface Props {
  onMapDestroyed: () => void;
  onGeojsonCreated: (geojson: Geometry) => void;
}
interface State {
  mbMap: MapboxMap | undefined;
}
export class MbMap extends Component<Props, State> {
  private _containerRef: HTMLDivElement | null = null;
  private _isMounted: boolean = false;

  state: State = {
    mbMap: undefined,
  };

  componentDidMount() {
    this._isMounted = true;
    this._initializeMap();
  }
  async _initializeMap() {
    if (!this._isMounted) {
      return;
    }
    const mbMap = new maplibregl.Map({
      container: this._containerRef!,
      style: { version: 8, sources: {}, layers: [] },
    });
    mbMap.dragRotate.disable();
    mbMap.touchZoomRotate.disableRotation();
    mbMap.on('load', function () {
      const data: unknown = world;
      // Use the topo map as a base layer because we don't know if the instance will have kbn basemap services enabled and we don't want to show a blank box
      const geo = topojson.feature(data as Topology, 'countries1'); // Load topo because it is smaller than geojson
      mbMap.addSource('maine', {
        type: 'geojson',
        data: geo,
      });
      mbMap.addLayer({
        id: 'maine',
        type: 'fill',
        source: 'maine',
        layout: {},
        paint: {
          'fill-color': '#088',
          'fill-opacity': 0.8,
        },
      });
    });
    this.setState({ mbMap });
  }
  componentWillUnmount() {
    this._isMounted = false;

    if (this.state.mbMap) {
      this.state.mbMap.remove();
      this.state.mbMap = undefined;
    }
    this.props.onMapDestroyed();
  }
  _setContainerRef = (element: HTMLDivElement) => {
    this._containerRef = element;
  };
  render(): React.ReactNode {
    let drawFilter = null;
    if (this.state.mbMap) {
      drawFilter = (
        <DrawFilter
          onFilterCreate={(g: Feature) => {
            this.props.onGeojsonCreated(g.geometry);
          }}
          mbMap={this.state.mbMap}
        />
      );
    }
    return (
      <div>
        <div id="map" ref={this._setContainerRef} style={{ height: '200px' }} />
        {drawFilter}
      </div>
    );
  }
}
