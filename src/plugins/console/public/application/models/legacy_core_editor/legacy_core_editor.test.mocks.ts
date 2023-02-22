/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('./mode/worker', () => {
  return { workerModule: { id: 'sense_editor/mode/worker', src: '' } };
});

import '@kbn/web-worker-stub';

// @ts-ignore
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

document.queryCommandSupported = () => true;
