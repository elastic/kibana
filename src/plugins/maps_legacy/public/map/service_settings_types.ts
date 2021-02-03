/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface TmsLayer {
  id: string;
  origin: string;
  minZoom: string;
  maxZoom: number;
  attribution: string;
}

export interface FileLayer {
  name: string;
  origin: string;
  id: string;
  format: string | { type: string };
  fields: FileLayerField[];
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
  getEMSHotLink(layer: FileLayer): Promise<string>;
  getTMSServices(): Promise<TmsLayer[]>;
  getFileLayers(): Promise<FileLayer[]>;
  getUrlForRegionLayer(layer: FileLayer): Promise<string>;
}
