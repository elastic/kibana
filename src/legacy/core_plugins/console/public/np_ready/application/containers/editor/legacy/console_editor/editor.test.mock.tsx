/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('../../../../contexts/editor_context/editor_registry.ts', () => ({
  instance: {
    setInputEditor: () => {},
    getInputEditor: () => ({
      getRequestsInRange: async () => [{ test: 'test' }],
      getCoreEditor: () => ({ getCurrentPosition: jest.fn() }),
    }),
  },
}));
jest.mock('../../../../components/editor_example.tsx', () => {});
jest.mock('../../../../../lib/mappings/mappings', () => ({
  retrieveAutoCompleteInfo: () => {},
  clearSubscriptions: () => {},
}));
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
      }),
      update: jest.fn(),
      commands: {
        addCommand: () => {},
      },
    }),
  };
});

jest.mock('../../../../hooks/use_send_current_request_to_es/send_request_to_es', () => ({
  sendRequestToES: jest.fn(),
}));
jest.mock('../../../../../lib/autocomplete/autocomplete', () => ({
  getEndpointFromPosition: jest.fn(),
}));
