/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
export type UrlParamValue = number | string | number[] | string[] | boolean;
export interface AutocompleteUrlParams {
  [key: string]: UrlParamValue;
}

export interface AutocompleteBodyParams {
  [key: string]: number | string;
}

export interface AutocompleteAvailability {
  stack: boolean;
  serverless: boolean;
}

export interface AutocompleteDefinition {
  documentation?: string;
  methods?: string[];
  patterns?: string[];
  url_params?: AutocompleteUrlParams;
  data_autocomplete_rules?: AutocompleteBodyParams;
  availability?: AutocompleteAvailability;
}
