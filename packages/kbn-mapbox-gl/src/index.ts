/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-expect-error
import mapboxgl from 'mapbox-gl/dist/mapbox-gl-csp';
// @ts-expect-error
import mbRtlPlugin from '!!file-loader!@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min.js';
// @ts-expect-error
import mbWorkerUrl from '!!file-loader!mapbox-gl/dist/mapbox-gl-csp-worker';

mapboxgl.workerUrl = mbWorkerUrl;
mapboxgl.setRTLTextPlugin(mbRtlPlugin);

// eslint-disable-next-line import/no-default-export
export default mapboxgl;
