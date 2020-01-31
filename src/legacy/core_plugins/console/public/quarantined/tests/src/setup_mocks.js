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
/* eslint no-undef: 0 */
jest.mock('../../src/sense_editor/mode/worker', () => {
  return { workerModule: { id: 'sense_editor/mode/worker', src: '' } };
});
window.Worker = function() {
  this.postMessage = () => {};
  this.terminate = () => {};
};
window.URL = {
  createObjectURL: () => {
    return '';
  },
};

import 'brace';
import 'brace/ext/language_tools';
import 'brace/ext/searchbox';
import 'brace/mode/json';
import 'brace/mode/text';

jest.mock('../../../../np_ready/public/application', () => ({
  legacyBackDoorToSettings: () => {},
}));

document.queryCommandSupported = () => true;

import jQuery from 'jquery';
jest.spyOn(jQuery, 'ajax').mockImplementation(
  () =>
    new Promise(() => {
      // never resolve
    })
);
