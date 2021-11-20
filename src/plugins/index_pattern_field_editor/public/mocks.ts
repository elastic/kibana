/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternFieldEditorPlugin } from './plugin';

export type Start = jest.Mocked<
  Omit<ReturnType<IndexPatternFieldEditorPlugin['start']>, 'DeleteRuntimeFieldProvider'>
> & {
  DeleteRuntimeFieldProvider: ReturnType<
    IndexPatternFieldEditorPlugin['start']
  >['DeleteRuntimeFieldProvider'];
};

export type Setup = jest.Mocked<ReturnType<IndexPatternFieldEditorPlugin['setup']>>;

const createSetupContract = (): Setup => {
  return {
    fieldFormatEditors: {
      register: jest.fn(),
    } as any,
  };
};

const createStartContract = (): Start => {
  return {
    openEditor: jest.fn(),
    openDeleteModal: jest.fn(),
    fieldFormatEditors: {
      getAll: jest.fn(),
      getById: jest.fn(),
    } as any,
    userPermissions: {
      editIndexPattern: jest.fn(),
    },
    DeleteRuntimeFieldProvider: ({ children }) => children(jest.fn()) as JSX.Element,
  };
};

export const indexPatternFieldEditorPluginMock = {
  createSetupContract,
  createStartContract,
};
