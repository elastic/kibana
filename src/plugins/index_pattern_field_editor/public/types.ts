/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { FunctionComponent } from 'react';
import type { RuntimeField, RuntimeType } from '../../data/common/index_patterns/types';
import type { DataPublicPluginStart } from '../../data/public/types';
import type { UsageCollectionStart } from '../../usage_collection/public/plugin';
import type { Props as DeleteFieldProviderProps } from './components/delete_field_provider';
import type { OpenFieldDeleteModalOptions } from './open_delete_modal';
import type { OpenFieldEditorOptions } from './open_editor';
import type {
  FormatEditorServiceSetup,
  FormatEditorServiceStart,
} from './service/format_editor_service';

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

export type FieldPreviewContext =
  | 'boolean_field'
  | 'date_field'
  | 'double_field'
  | 'geo_point_field'
  | 'ip_field'
  | 'keyword_field'
  | 'long_field';

export interface FieldPreviewResponse {
  values: unknown[];
  error?: Record<string, any>;
}
