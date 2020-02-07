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

export interface ServiceSettings {
  getEMSHotLink(layer: FileLayer): Promise<string>;
  getTMSServices(): Promise<TmsLayer[]>;
  getFileLayers(): Promise<FileLayer[]>;
}
