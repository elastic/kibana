/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VegaBaseView } from './vega_base_view';
import { setInjectedVars } from '../services';

function createMockView(spec) {
  setInjectedVars({ enableExternalUrls: false });

  return new VegaBaseView({
    parentEl: document.createElement('div'),
    vegaParser: {
      spec,
      vlspec: null,
      isVegaLite: false,
      renderer: 'canvas',
      tooltips: false,
      searchAPI: { inspectorAdapters: {} },
    },
    fireEvent: jest.fn(),
    filterManager: { getFilters: jest.fn(() => []) },
    externalUrl: {
      isInternalUrl: jest.fn(() => true),
      validateUrl: jest.fn(() => true),
    },
    vegaStateRestorer: { save: jest.fn(), restore: jest.fn() },
  });
}

describe('VegaBaseView loader options sanitization', () => {
  test('only allowlisted properties are forwarded from usermeta.embedOptions.loader', () => {
    const view = createMockView({
      $schema: 'https://vega.github.io/schema/vega/v5.json',
      usermeta: {
        embedOptions: {
          loader: {
            target: '_blank',
            rel: 'noreferrer',
            baseURL: '/some/path',
            mode: 'http',
            foo: 'bar',
          },
        },
      },
    });

    const config = view.createViewConfig();

    expect(config.loader.options).toEqual({ target: '_blank', rel: 'noreferrer' });
  });

  test('preserves the target property', () => {
    const view = createMockView({
      $schema: 'https://vega.github.io/schema/vega/v5.json',
      usermeta: {
        embedOptions: {
          loader: { target: '_blank' },
        },
      },
    });

    const config = view.createViewConfig();

    expect(config.loader.options).toEqual({ target: '_blank' });
  });

  test('coerces allowed values to strings', () => {
    const view = createMockView({
      $schema: 'https://vega.github.io/schema/vega/v5.json',
      usermeta: {
        embedOptions: {
          loader: { target: 123, rel: true },
        },
      },
    });

    const config = view.createViewConfig();

    expect(config.loader.options).toEqual({ target: '123', rel: 'true' });
  });

  test('defaults to empty options when no usermeta is provided', () => {
    const view = createMockView({
      $schema: 'https://vega.github.io/schema/vega/v5.json',
    });

    const config = view.createViewConfig();

    expect(config.loader.options).toEqual({});
  });
});
