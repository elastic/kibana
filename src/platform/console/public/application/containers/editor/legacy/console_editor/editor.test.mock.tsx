/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO(jbudz): should be removed when upgrading to TS@4.8
// this is a skip for the errors created when typechecking with isolatedModules
export {};

jest.mock('../../../../contexts/editor_context/editor_registry', () => ({
  instance: {
    setInputEditor: () => {},
    getInputEditor: () => ({
      getRequestsInRange: async () => [{ test: 'test' }],
      getCoreEditor: () => ({ getCurrentPosition: jest.fn() }),
    }),
  },
}));
jest.mock('../../../../components/editor_example', () => {});
jest.mock('../../../../models/sense_editor', () => {
  return {
    create: () => ({
      getCoreEditor: () => ({
        registerKeyboardShortcut: jest.fn(),
        setStyles: jest.fn(),
        getContainer: () => ({
          focus: () => {},
        }),
        on: jest.fn(),
        addFoldsAtRanges: jest.fn(),
        getAllFoldRanges: jest.fn(),
      }),
      update: jest.fn(),
      commands: {
        addCommand: () => {},
      },
    }),
  };
});

jest.mock('../../../../hooks/use_send_current_request/send_request', () => ({
  sendRequest: jest.fn(),
}));
jest.mock('../../../../../lib/autocomplete/get_endpoint_from_position', () => ({
  getEndpointFromPosition: jest.fn(),
}));
