/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface NotebookDefinition {
  cells: NotebookCellType[];
  metadata?: NotebookMetadataType;
  nbformat?: number;
  nbformat_minor?: number;
}

export interface NotebookMetadataType {
  kernelspec?: {
    display_name?: string;
    language?: string;
    name?: string;
  };
  language_info?: {
    mimetype?: string;
    name?: string;
    version?: string;
  };
}

export interface NotebookCellType {
  auto_number?: number;
  cell_type?: string;
  execution_count?: number | null;
  id?: string;
  input?: string[];
  metadata?: {
    id?: string;
  };
  outputs?: NotebookOutputType[];
  prompt_number?: number;
  source?: string[];
}

export interface NotebookOutputType {
  name?: string;
  ename?: string;
  evalue?: string;
  traceback?: string[];
  data?: NotebookOutputData;
  output_type?: string;
  png?: string;
  jpeg?: string;
  gif?: string;
  svg?: string;
  text?: string[];
  execution_count?: number;
}

export interface NotebookOutputData {
  'text/plain'?: string[];
  'text/html'?: string[];
  'text/latex'?: string[];
  'image/png'?: string;
  'image/jpeg'?: string;
  'image/gif'?: string;
  'image/svg+xml'?: string;
  'application/javascript'?: string[];
}
