/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Represents a data view object returned by the Kibana API
 */
export interface DataView {
  id: string;
  version: string;
  title: string;
  timeFieldName?: string;
  sourceFilters?: Array<{ value: string }>;
  fields?: Record<string, any>;
  typeMeta?: Record<string, any>;
  fieldFormats?: Record<string, any>;
  fieldAttrs?: Record<string, any>;
  allowNoIndex?: boolean;
  runtimeFieldMap?: Record<string, any>;
  namespaces?: string[];
  name?: string;
}

/**
 * Response from the get all data views API
 */
export interface GetDataViewsResponse {
  data_view: DataView[];
}

/**
 * Response from the get single data view API
 */
export interface GetDataViewResponse {
  data_view: DataView;
}

/**
 * Response with just the status code
 */
export interface DataViewStatusResponse {
  status: number;
}

/**
 * Response with data and status
 */
export interface DataViewApiResponse<T> {
  data: T;
  status: number;
}
