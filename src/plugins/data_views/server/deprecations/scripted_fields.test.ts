/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hasScriptedField } from './scripted_fields';

describe('hasScriptedField', () => {
  test('valid index pattern object with a scripted field', () => {
    expect(
      hasScriptedField({
        title: 'kibana_sample_data_logs*',
        fields:
          '[{"count":0,"script":"return 5;","lang":"painless","name":"test","type":"number","scripted":true,"searchable":true,"aggregatable":true,"readFromDocValues":false,"customLabel":""}]',
      })
    ).toBe(true);
  });

  test('valid index pattern object without a scripted field', () => {
    expect(
      hasScriptedField({
        title: 'kibana_sample_data_logs*',
        fields: '[]',
      })
    ).toBe(false);
  });

  test('invalid index pattern object', () => {
    expect(
      hasScriptedField({
        title: 'kibana_sample_data_logs*',
        fields: '[...]',
      })
    ).toBe(false);
  });
});
