/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import type {
  RuntimeType,
  RuntimeField,
  SerializedFieldFormat,
  RuntimePrimitiveTypes,
} from '../../shared_imports';
import type { RuntimeFieldPainlessError } from '../../types';
import type { PreviewController } from './preview_controller';

export type DocumentSource = 'cluster' | 'custom';

export interface EsDocument {
  _id: string;
  _index: string;
  _source: {
    [key: string]: unknown;
  };
  fields: {
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

export interface PreviewState {
  pinnedFields: Record<string, boolean>;
  isLoadingDocuments: boolean;
  customId: string | undefined;
  documents: EsDocument[];
  currentIdx: number;
  documentSource: DocumentSource;
  scriptEditorValidation: {
    isValidating: boolean;
    isValid: boolean;
    message: string | null;
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
  format: SerializedFieldFormat | null;
  document: EsDocument | null;
  // used for composite subfields
  parentName: string | null;
}

export interface FieldPreview {
  key: string;
  value: unknown;
  formattedValue?: string;
  type?: string;
}

export interface FieldTypeInfo {
  name: string;
  type: string;
}

export enum ChangeType {
  UPSERT = 'upsert',
  DELETE = 'delete',
}
export interface Change {
  changeType: ChangeType;
  type?: RuntimePrimitiveTypes;
}

export type ChangeSet = Record<string, Change>;

export interface Context {
  controller: PreviewController;
  fields: FieldPreview[];
  fieldPreview$: BehaviorSubject<FieldPreview[] | undefined>;
  error: PreviewError | null;
  fieldTypeInfo?: FieldTypeInfo[];
  initialPreviewComplete: boolean;
  params: {
    value: Params;
    update: (updated: Partial<Params>) => void;
  };
  isPreviewAvailable: boolean;
  isLoadingPreview: boolean;
  documents: {
    loadSingle: (id: string) => void;
    loadFromCluster: () => Promise<void>;
    fetchDocError: FetchDocError | null;
  };
  panel: {
    isVisible: boolean;
    setIsVisible: (isVisible: boolean) => void;
  };
  navigation: {
    isFirstDoc: boolean;
    isLastDoc: boolean;
  };
  reset: () => void;
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
