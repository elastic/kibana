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
      getRequestsInRange: (cb: any) => cb([{ test: 'test' }]),
    }),
  },
}));
jest.mock('../../../../components/editor_example.tsx', () => {});
jest.mock('../../../../../../../public/quarantined/src/mappings.js', () => ({
  retrieveAutoCompleteInfo: () => {},
  clearSubscriptions: () => {},
}));
jest.mock('../../../../../../../public/quarantined/src/input.ts', () => {
  return {
    initializeEditor: () => ({
      $el: {
        css: () => {},
      },
      focus: () => {},
      update: () => {},
      getSession: () => ({ on: () => {}, setUseWrapMode: () => {} }),
      commands: {
        addCommand: () => {},
      },
    }),
  };
});

jest.mock('../../../../hooks/use_send_current_request_to_es/send_request_to_es', () => ({
  sendRequestToES: jest.fn(),
}));
