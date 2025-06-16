/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const DEFAULT_EMS_FILE_API_URL = 'https://vector.maps.elastic.co';
export const DEFAULT_EMS_TILE_API_URL = 'https://tiles.maps.elastic.co';
export const DEFAULT_EMS_LANDING_PAGE_URL = 'https://maps.elastic.co';
export const DEFAULT_EMS_FONT_LIBRARY_URL =
  'https://tiles.maps.elastic.co/fonts/{fontstack}/{range}.pbf';

// Theme-bound style identifiers
export const EMS_ROADMAP_BOREALIS_DESATURATED_ID = 'road_map_desaturated_v9';
export const EMS_DARKMAP_BOREALIS_ID = 'dark_map_v9';
export const EMS_ROADMAP_AMSTERDAM_DESATURATED_ID = 'road_map_desaturated';
export const EMS_DARKMAP_AMSTERDAM_ID = 'dark_map';

// Default identifiers
export const DEFAULT_EMS_ROADMAP_ID = 'road_map';

// To be updated when Kibana only ships the Borealis tehem
export const DEFAULT_EMS_ROADMAP_DESATURATED_ID = EMS_ROADMAP_AMSTERDAM_DESATURATED_ID;
export const DEFAULT_EMS_DARKMAP_ID = EMS_DARKMAP_AMSTERDAM_ID;

export const EMS_APP_NAME = 'kibana'; // app-name submitted as the `app`-param to EMS

export const DEFAULT_EMS_REST_VERSION = '2023-10-31';
