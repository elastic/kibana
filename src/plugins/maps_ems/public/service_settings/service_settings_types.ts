/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface TmsLayer {
  id: string;
  origin: string;
  minZoom: number;
  maxZoom: number;
  attribution: string;
}

export interface FileLayer {
  name: string;
  origin: string;
  id: string;
  format: string | { type: string };
  fields: FileLayerField[];
  url?: string;
  layerId?: string;
  created_at?: string;
  attribution?: string;
  meta?: {
    [key: string]: string;
  };
}

export interface FileLayerField {
  name: string;
  description: string;
  type: string;
}

export interface VectorLayer extends FileLayer {
  layerId: string;
  isEMS: boolean;
}

export interface IServiceSettings {
  getEMSHotLink(layer: FileLayer): Promise<string | null>;
  getTMSServices(): Promise<TmsLayer[]>;
  getFileLayers(): Promise<FileLayer[]>;
  getUrlForRegionLayer(layer: FileLayer): Promise<string | undefined>;
  setQueryParams(params: { [p: string]: string }): void;
  getAttributesForTMSLayer(
    tmsServiceConfig: TmsLayer,
    isDesaturated: boolean,
    isDarkMode: boolean
  ): any;
}
