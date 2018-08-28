/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export interface kbn_server {
    config: () => configObject;
  }
  
export interface configObject {
    get: (path: string) => ConfigEntry;
}

export interface ConfigEntry {
    zoom: number;
    viewport: ViewWidthHeight;
  }
  
export interface ViewWidthHeight {
    width: number;
    height: number;
  }
  
export interface ViewZoomWidthHeight {
    zoom: number;
    width: number;
    height: number;
  }
export interface ViewWidth {
    width: number;
  }