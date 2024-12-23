/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { PanelNotFoundError } from './errors';

describe('IncompatibleActionError', () => {
  test('is instance of error', () => {
    const error = new IncompatibleActionError();
    expect(error).toBeInstanceOf(Error);
  });

  test('has INCOMPATIBLE_ACTION code', () => {
    const error = new IncompatibleActionError();
    expect(error.code).toBe('INCOMPATIBLE_ACTION');
  });
});

describe('PanelNotFoundError', () => {
  test('is instance of error', () => {
    const error = new PanelNotFoundError();
    expect(error).toBeInstanceOf(Error);
  });

  test('has PANEL_NOT_FOUND code', () => {
    const error = new PanelNotFoundError();
    expect(error.code).toBe('PANEL_NOT_FOUND');
  });
});
