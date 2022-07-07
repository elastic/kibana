/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FunctionComponent } from 'react';

import {
  DataPublicPluginStart,
  DataViewsPublicPluginStart,
  RuntimeField,
  RuntimeType,
  UsageCollectionStart,
  FieldFormatsStart,
} from './shared_imports';
import { OpenFieldEditorOptions } from './open_editor';
import { OpenFieldDeleteModalOptions } from './open_delete_modal';
import { FormatEditorServiceSetup, FormatEditorServiceStart } from './service';
import { DeleteFieldProviderProps } from './components';

export interface PluginSetup {
  fieldFormatEditors: FormatEditorServiceSetup['fieldFormatEditors'];
}

export interface PluginStart {
  openEditor(options: OpenFieldEditorOptions): () => void;
  openDeleteModal(options: OpenFieldDeleteModalOptions): () => void;
  fieldFormatEditors: FormatEditorServiceStart['fieldFormatEditors'];
  userPermissions: {
    editIndexPattern: () => boolean;
  };
  DeleteRuntimeFieldProvider: FunctionComponent<DeleteFieldProviderProps>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupPlugins {}

export interface StartPlugins {
  data: DataPublicPluginStart;
  usageCollection: UsageCollectionStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
}

export type InternalFieldType = 'concrete' | 'runtime';

export interface Field {
  name: string;
  type: RuntimeField['type'] | string;
  script?: RuntimeField['script'];
  customLabel?: string;
  popularity?: number;
  format?: FieldFormatConfig;
}

export interface FieldFormatConfig {
  id: string;
  params?: { [key: string]: any };
}

export interface EsRuntimeField {
  type: RuntimeType | string;
  script?: {
    source: string;
  };
}

export type CloseEditor = () => void;

export type PainlessErrorCode = 'CAST_ERROR' | 'UNKNOWN';

export interface RuntimeFieldPainlessError {
  message: string;
  reason: string;
  position: {
    offset: number;
    start: number;
    end: number;
  } | null;
  scriptStack: string[];
  code: PainlessErrorCode;
}

export interface MonacoEditorErrorMarker {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
}
