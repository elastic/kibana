/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { PanelNotFoundError, EmbeddableFactoryNotFoundError } from './errors';

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

describe('EmbeddableFactoryNotFoundError', () => {
  test('is instance of error', () => {
    const error = new EmbeddableFactoryNotFoundError('type1');
    expect(error).toBeInstanceOf(Error);
  });

  test('has EMBEDDABLE_FACTORY_NOT_FOUND code', () => {
    const error = new EmbeddableFactoryNotFoundError('type1');
    expect(error.code).toBe('EMBEDDABLE_FACTORY_NOT_FOUND');
  });
});
