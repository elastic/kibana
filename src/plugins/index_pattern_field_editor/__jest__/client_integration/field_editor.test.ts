/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test/jest';
import { setupEnvironment } from './helpers';
import { setup } from './field_editor.helpers';

describe('<FieldEditor />', () => {
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  let testBed: TestBed;

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setFieldPreviewResponse({ message: 'TODO: set by Jest test' });

    await act(async () => {
      testBed = setup();
    });
  });

  test('it should work', () => {
    expect(true).toBe(true);
  });
});
