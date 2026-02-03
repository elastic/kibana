/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '../../../..';
import { summary } from './summary';

describe('COMPLETION > summary', () => {
  it('adds "completion" column, when custom name is not specified', () => {
    const result = summary(
      synth.cmd`COMPLETION "prompt" WITH {"inference_id": "my-inference-id"}`,
      ''
    );
    expect(result).toEqual({ newColumns: new Set(['completion']) });
  });

  it('adds the given name as column when specified', () => {
    const result = summary(
      synth.cmd`COMPLETION customField = "prompt" WITH {"inference_id": "my-inference-id"}`,
      ''
    );
    expect(result).toEqual({ newColumns: new Set(['customField']) });
  });
});
