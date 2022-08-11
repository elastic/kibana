/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext, FunctionComponent, useMemo } from 'react';
import { NotificationsStart, CoreStart } from '@kbn/core/public';
import { FieldFormatsStart } from '../shared_imports';
import type { DataView, DataPublicPluginStart } from '../shared_imports';
import { ApiService } from '../lib/api';
import type { InternalFieldType, PluginStart } from '../types';

export interface Context {
  dataView: DataView;
  fieldTypeToProcess: InternalFieldType;
  uiSettings: CoreStart['uiSettings'];
  links: {
    runtimePainless: string;
  };
  services: {
    search: DataPublicPluginStart['search'];
    api: ApiService;
    notifications: NotificationsStart;
  };
  fieldFormatEditors: PluginStart['fieldFormatEditors'];
  fieldFormats: FieldFormatsStart;
  /**
   * An array of field names not allowed.
   * e.g we probably don't want a user to give a name of an existing
   * runtime field (for that the user should edit the existing runtime field).
   */
  namesNotAllowed: string[];
  /**
   * An array of existing concrete fields. If the user gives a name to the runtime
   * field that matches one of the concrete fields, a callout will be displayed
   * to indicate that this runtime field will shadow the concrete field.
   * It is also used to provide the list of field autocomplete suggestions to the code editor.
   */
  existingConcreteFields: Array<{ name: string; type: string }>;
}

const fieldEditorContext = createContext<Context | undefined>(undefined);

export const FieldEditorProvider: FunctionComponent<Context> = ({
  services,
  dataView,
  links,
  uiSettings,
  fieldTypeToProcess,
  fieldFormats,
  fieldFormatEditors,
  namesNotAllowed,
  existingConcreteFields,
  children,
}) => {
  const ctx = useMemo<Context>(
    () => ({
      dataView,
      fieldTypeToProcess,
      links,
      uiSettings,
      services,
      fieldFormats,
      fieldFormatEditors,
      namesNotAllowed,
      existingConcreteFields,
    }),
    [
      dataView,
      fieldTypeToProcess,
      services,
      links,
      uiSettings,
      fieldFormats,
      fieldFormatEditors,
      namesNotAllowed,
      existingConcreteFields,
    ]
  );

  return <fieldEditorContext.Provider value={ctx}>{children}</fieldEditorContext.Provider>;
};

export const useFieldEditorContext = (): Context => {
  const ctx = useContext(fieldEditorContext);

  if (ctx === undefined) {
    throw new Error('useFieldEditorContext must be used within a <FieldEditorContext />');
  }

  return ctx;
};

export const useFieldEditorServices = () => useFieldEditorContext().services;
