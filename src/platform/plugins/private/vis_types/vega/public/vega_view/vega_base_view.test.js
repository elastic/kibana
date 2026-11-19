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

function createMockView(spec, params = {}) {
  setInjectedVars({ enableExternalUrls: false });

  return new VegaBaseView({
    parentEl: document.createElement('div'),
    descriptor: {
      spec,
      vlspec: null,
      isVegaLite: false,
      renderer: 'canvas',
      tooltips: false,
      trustedDataUrls: [],
    },
    onError: jest.fn(),
    onViewCreated: jest.fn(),
    onFilterAction: jest.fn(),
    externalUrl: {
      isInternalUrl: jest.fn(() => true),
      validateUrl: jest.fn(() => true),
    },
    vegaStateRestorer: { save: jest.fn(), restore: jest.fn() },
    ...params,
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

describe('VegaBaseView external URL check', () => {
  const spec = { $schema: 'https://vega.github.io/schema/vega/v5.json' };
  const externalUrl = { isInternalUrl: jest.fn(() => false), validateUrl: jest.fn(() => true) };

  test('loads a URL Kibana resolved for the spec without the external URL check', async () => {
    const view = createMockView(spec, {
      externalUrl,
      descriptor: { spec, trustedDataUrls: ['https://ems.example/file1.geojson'] },
    });

    const { href } = await view
      .createViewConfig()
      .loader.sanitize('https://ems.example/file1.geojson', {});

    expect(href).toBe('https://ems.example/file1.geojson');
    expect(externalUrl.isInternalUrl).not.toHaveBeenCalled();
  });

  test('rejects any other external URL while external URLs are disabled', async () => {
    const onError = jest.fn();
    const view = createMockView(spec, {
      externalUrl,
      onError,
      descriptor: { spec, trustedDataUrls: ['https://ems.example/file1.geojson'] },
    });

    await expect(
      view.createViewConfig().loader.sanitize('https://ems.example/other.geojson', {})
    ).rejects.toThrow('External URLs are not enabled');
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('External URLs are not enabled'));
  });
});

describe('VegaBaseView errors', () => {
  test('displays a parse error carried by the descriptor', async () => {
    const parentEl = document.createElement('div');
    const onError = jest.fn();
    const view = createMockView(
      {},
      {
        parentEl,
        onError,
        descriptor: { warnings: [], error: 'Invalid Vega specification' },
      }
    );

    await view.init();

    expect(parentEl.textContent).toContain('Invalid Vega specification');
    expect(onError).toHaveBeenCalledWith('Invalid Vega specification');
  });
});

describe('VegaBaseView messages', () => {
  test('shows a repeated error once', () => {
    const parentEl = document.createElement('div');
    const view = createMockView({}, { parentEl });

    view.onError(new Error('Index "missing" not found'));
    view.onError(new Error('Index "missing" not found'));

    expect(parentEl.querySelectorAll('.vgaVis__message--err')).toHaveLength(1);
  });
});

describe('VegaBaseView filter actions', () => {
  test('forwards the function name and arguments to the parent', async () => {
    const onFilterAction = jest.fn().mockResolvedValue(undefined);
    const view = createMockView({}, { onFilterAction });

    await view.emitFilterAction('kibanaAddFilter', [{ match_all: {} }, 'logs-*']);

    expect(onFilterAction).toHaveBeenCalledWith({
      fn: 'kibanaAddFilter',
      args: [{ match_all: {} }, 'logs-*'],
    });
  });

  test('displays the error the parent rejects with', async () => {
    const onError = jest.fn();
    const parentEl = document.createElement('div');
    const onFilterAction = jest.fn().mockRejectedValue(new Error('Index "missing" not found'));
    const view = createMockView({}, { onError, onFilterAction, parentEl });

    await view.emitFilterAction('kibanaAddFilter', [{ match_all: {} }, 'missing']);

    expect(onError).toHaveBeenCalledWith('Index "missing" not found');
    expect(parentEl.textContent).toContain('Index "missing" not found');
  });
});
