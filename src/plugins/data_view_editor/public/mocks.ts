/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewEditorPlugin } from './plugin';

export type Start = jest.Mocked<ReturnType<DataViewEditorPlugin['start']>>;

export type Setup = jest.Mocked<ReturnType<DataViewEditorPlugin['setup']>>;

const createSetupContract = (): Setup => {
  return {};
};

const createStartContract = (): Start => {
  return {
    openEditor: jest.fn(),
    IndexPatternEditorComponent: jest.fn(),
    userPermissions: {
      editDataView: jest.fn(),
    },
  };
};

export const indexPatternEditorPluginMock = {
  createSetupContract,
  createStartContract,
};
