/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState } from 'react';
import { maplibregl } from '@kbn/mapbox-gl';
import type { Map as MapLibreMap } from '@kbn/mapbox-gl';
import './ems_map.scss';
import { FeatureCollection } from 'geojson';
import { DEFAULT_EMPTY_STYLE } from '../../common/ems_defaults';

interface EmsMapProps {
  loading: boolean;
  styleId?: string;
  features?: FeatureCollection;
}

export function EmsMap({ loading, styleId, features }: EmsMapProps) {
  const overlaySourceId = 'overlay-source';
  const overlayFillLayerId = 'overlay-fill-layer';
  const overlayLineLayerId = 'overlay-line-layer';
  const overlayFillHighlightId = 'overlay-fill-highlight-layer';
  const tmsSourceId = 'vector-tms-source';
  const tmsLayerId = 'vector-tms-layer';
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const [styleLoaded, setStyleLoaded] = useState(false);

  // Initializes a blank map on component mount and calls map.remove when unmounted
  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: DEFAULT_EMPTY_STYLE,
    }) as unknown as MapLibreMap;
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    map.on('load', () => setStyleLoaded(true));

    return () => {
      map.remove();
    };
  }, []);

  // Set the background for the map

  // Maybe need another useEffect for setting overlay? Needs to check
  // map.isStyleLoaded before adding source.

  // useEffect(() => {
  //   debugger;
  //   if (loading || mapRef.current === null || !features || !styleLoaded) return;

  //   setStyleLoaded(false);
  //   mapRef.current.addSource(overlaySourceId, {
  //     type: 'geojson',
  //     data: features,
  //   });

  //   mapRef.current.addLayer({
  //     id: overlayFillLayerId,
  //     source: overlaySourceId,
  //     type: 'fill',
  //     paint: {
  //       'fill-color': '#DCDCDC',
  //       'fill-opacity': 0.6,
  //     },
  //   });
  //   return () => {
  //     mapRef.current?.removeLayer(overlayFillLayerId);
  //     mapRef.current?.removeSource(overlaySourceId);
  //   };
  // }, [loading, features, styleLoaded]);

  // const waitForStyleLoaded = (callback) => {
  //   const waiting = () => {
  //     if (!mapRef.current === null || !mapRef.current?.isStyleLoaded()) {
  //       setTimeout(waiting, 50);
  //     } else {
  //       callback();
  //     }
  //   };
  //   waiting();
  // };

  return (
    <div className="mapWrapper">
      <div ref={mapContainer} className="mapContainer" />
    </div>
  );
}
