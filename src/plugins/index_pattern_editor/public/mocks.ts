/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternEditorPlugin } from './plugin';

export type Start = jest.Mocked<
  Omit<ReturnType<IndexPatternEditorPlugin['start']>, 'DeleteRuntimeFieldProvider'>
>;

export type Setup = jest.Mocked<ReturnType<IndexPatternEditorPlugin['setup']>>;

const createSetupContract = (): Setup => {
  return {};
};

const createStartContract = (): Start => {
  return {
    openEditor: jest.fn(),
    userPermissions: {
      editIndexPattern: jest.fn(),
    },
  };
};

export const indexPatternFieldEditorPluginMock = {
  createSetupContract,
  createStartContract,
};
