/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldSpec } from '@kbn/data-views-plugin/public';
import { FunctionComponent } from 'react';
import { DeleteFieldProviderProps } from './components';
import { OpenFieldDeleteModalOptions } from './open_delete_modal';
import { OpenFieldEditorOptions } from './open_editor';
import { FormatEditorServiceSetup, FormatEditorServiceStart } from './service';
import {
  DataPublicPluginStart,
  DataViewsPublicPluginStart,
  FieldFormatsStart,
  RuntimeField,
  UsageCollectionStart,
  RuntimeType,
  SerializedFieldFormat,
} from './shared_imports';

/**
 * Public setup contract of data view field editor
 * @public
 */
export interface PluginSetup {
  fieldFormatEditors: FormatEditorServiceSetup['fieldFormatEditors'];
}

/**
 * Public start contract of data view field editor
 * @public
 */
export interface PluginStart {
  /**
   * Method to open the data view field editor fly-out
   */
  openEditor(options: OpenFieldEditorOptions): Promise<CloseEditor>;
  /**
   * Method to open the data view field delete fly-out
   * @param options Configuration options for the fly-out
   */
  openDeleteModal(options: OpenFieldDeleteModalOptions): Promise<CloseEditor>;
  fieldFormatEditors: FormatEditorServiceStart['fieldFormatEditors'];
  /**
   * Convenience method for user permissions checks
   */
  userPermissions: {
    /**
     * Whether the user has permission to edit data views
     */
    editIndexPattern: () => boolean;
  };
  /**
   * Context provider for delete runtime field modal
   */
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

/**
 * The data model for the field editor
 * @public
 */
export interface Field extends RuntimeField {
  /**
   * name / path used for the field
   */
  name: FieldSpec['name'];
  /**
   * Name of parent field. Used for composite subfields
   */
  parentName?: string;
}

export interface FieldFormatConfig {
  id: string;
  params?: SerializedFieldFormat['params'];
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
