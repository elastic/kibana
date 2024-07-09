/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  createContext,
  useContext,
  FunctionComponent,
  useMemo,
  PropsWithChildren,
} from 'react';
import { NotificationsStart, CoreStart } from '@kbn/core/public';
import type { BehaviorSubject } from 'rxjs';
import type {
  DataViewLazy,
  DataPublicPluginStart,
  FieldFormatsStart,
  RuntimeFieldSubFields,
} from '../shared_imports';
import { ApiService } from '../lib/api';
import type { InternalFieldType, PluginStart } from '../types';

export interface Context {
  dataView: DataViewLazy;
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

  fieldName$: BehaviorSubject<string>;
  subfields$: BehaviorSubject<RuntimeFieldSubFields | undefined>;
}

const fieldEditorContext = createContext<Context | undefined>(undefined);

export const FieldEditorProvider: FunctionComponent<PropsWithChildren<Context>> = ({
  services,
  dataView,
  links,
  uiSettings,
  fieldTypeToProcess,
  fieldFormats,
  fieldFormatEditors,
  children,
  fieldName$,
  subfields$,
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
      fieldName$,
      subfields$,
    }),
    [
      dataView,
      fieldTypeToProcess,
      services,
      links,
      uiSettings,
      fieldFormats,
      fieldFormatEditors,
      fieldName$,
      subfields$,
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
