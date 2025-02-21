/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLRealField, JoinIndexAutocompleteItem } from '../validation/types';

/** @internal **/
type CallbackFn<Options = {}, Result = string> = (ctx?: Options) => Result[] | Promise<Result[]>;

/**
 *  Partial fields metadata client, used to avoid circular dependency with @kbn/monaco
/** @internal **/
export interface PartialFieldsMetadataClient {
  find: ({ fieldNames, attributes }: { fieldNames?: string[]; attributes: string[] }) => Promise<{
    fields: Record<
      string,
      {
        type: string;
        source: string;
        description?: string;
      }
    >;
  }>;
}

/** @public **/
export interface ESQLSourceResult {
  name: string;
  hidden: boolean;
  title?: string;
  dataStreams?: Array<{ name: string; title?: string }>;
  type?: string;
}

export interface ESQLControlVariable {
  key: string;
  value: string | number;
  type: ESQLVariableType;
}

export enum ESQLVariableType {
  TIME_LITERAL = 'time_literal',
  FIELDS = 'fields',
  VALUES = 'values',
  FUNCTIONS = 'functions',
}

export interface ESQLCallbacks {
  getSources?: CallbackFn<{}, ESQLSourceResult>;
  getColumnsFor?: CallbackFn<{ query: string }, ESQLRealField>;
  getPolicies?: CallbackFn<
    {},
    { name: string; sourceIndices: string[]; matchField: string; enrichFields: string[] }
  >;
  getPreferences?: () => Promise<{ histogramBarTarget: number }>;
  getFieldsMetadata?: Promise<PartialFieldsMetadataClient>;
  getVariablesByType?: (type: ESQLVariableType) => ESQLControlVariable[] | undefined;
  canSuggestVariables?: () => boolean;
  getJoinIndices?: () => Promise<{ indices: JoinIndexAutocompleteItem[] }>;
}

export type ReasonTypes = 'missingCommand' | 'unsupportedFunction' | 'unknownFunction';
