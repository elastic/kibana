/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';

import type { RuntimeType, RuntimeField } from '../../shared_imports';
import type { FieldFormatConfig, RuntimeFieldPainlessError } from '../../types';

export type From = 'cluster' | 'custom';

export interface EsDocument {
  _id: string;
  _index: string;
  _source: {
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type ScriptErrorCodes = 'PAINLESS_SCRIPT_ERROR' | 'PAINLESS_SYNTAX_ERROR';
export type FetchDocErrorCodes = 'DOC_NOT_FOUND' | 'ERR_FETCHING_DOC';

interface PreviewError {
  code: ScriptErrorCodes;
  error:
    | RuntimeFieldPainlessError
    | {
        reason?: string;
        [key: string]: unknown;
      };
}

export interface FetchDocError {
  code: FetchDocErrorCodes;
  error: {
    message?: string;
    reason?: string;
    [key: string]: unknown;
  };
}

export interface ClusterData {
  documents: EsDocument[];
  currentIdx: number;
}

// The parameters required to preview the field
export interface Params {
  name: string | null;
  index: string | null;
  type: RuntimeType | null;
  script: Required<RuntimeField>['script'] | null;
  format: FieldFormatConfig | null;
  document: { [key: string]: unknown } | null;
}

export interface FieldPreview {
  key: string;
  value: unknown;
  formattedValue?: string;
}

export interface Context {
  fields: FieldPreview[];
  error: PreviewError | null;
  params: {
    value: Params;
    update: (updated: Partial<Params>) => void;
  };
  isPreviewAvailable: boolean;
  isLoadingPreview: boolean;
  currentDocument: {
    value?: EsDocument;
    id?: string;
    isLoading: boolean;
    isCustomId: boolean;
  };
  documents: {
    loadSingle: (id: string) => void;
    loadFromCluster: () => Promise<void>;
    fetchDocError: FetchDocError | null;
  };
  panel: {
    isVisible: boolean;
    setIsVisible: (isVisible: boolean) => void;
  };
  from: {
    value: From;
    set: (value: From) => void;
  };
  navigation: {
    isFirstDoc: boolean;
    isLastDoc: boolean;
    next: () => void;
    prev: () => void;
  };
  reset: () => void;
  pinnedFields: {
    value: { [key: string]: boolean };
    set: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
  };
  validation: {
    setScriptEditorValidation: React.Dispatch<
      React.SetStateAction<{ isValid: boolean; isValidating: boolean; message: string | null }>
    >;
  };
}

export type PainlessExecuteContext =
  | 'boolean_field'
  | 'date_field'
  | 'double_field'
  | 'geo_point_field'
  | 'ip_field'
  | 'keyword_field'
  | 'long_field';

export interface FieldPreviewResponse {
  values: unknown[];
  error?: ScriptError;
}

export interface ScriptError {
  caused_by: {
    reason: string;
    [key: string]: unknown;
  };
  position?: {
    offset: number;
    start: number;
    end: number;
  };
  script_stack?: string[];
  [key: string]: unknown;
}
