/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TmsLayer } from '../../../maps_ems/public';

export interface WMSOptions {
  selectedTmsLayer?: TmsLayer;
  enabled: boolean;
  url?: string;
  options: {
    version?: string;
    layers?: string;
    format: string;
    transparent: boolean;
    attribution?: string;
    styles?: string;
  };
}
