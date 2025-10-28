/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco/src/monaco_imports';
import { createMockMonacoTextModel } from './monaco_model';

describe('createMockModel', () => {
  it('should create a mock model', () => {
    const model = createMockMonacoTextModel('name: one_step_workflow');
    expect(model.getLineCount()).toBe(1);
  });
  it('should calculate offset from position', () => {
    const model = createMockMonacoTextModel(`name: one_step_workflow
steps:
  - name: get_google
    type: http
    with:
      url: https://google.com`);
    expect(model.getOffsetAt(new monaco.Position(1, 1))).toBe(0);
    expect(model.getOffsetAt(new monaco.Position(1, 2))).toBe(1);
    expect(model.getOffsetAt(new monaco.Position(2, 1))).toBe(24);
  });
});
