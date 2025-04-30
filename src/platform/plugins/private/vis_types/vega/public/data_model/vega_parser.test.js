/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { cloneDeep } from 'lodash';
import 'jest-canvas-mock';
import { TimeCache } from './time_cache';
import { VegaParser } from './vega_parser';
import { bypassExternalUrlCheck } from '../vega_view/vega_base_view';
import { VegaThemeColors } from './utils';
import { DEFAULT_EMS_DARKMAP_ID } from '@kbn/maps-ems-plugin/common';

jest.mock('../services');

const theme = { name: 'borealis', darkMode: false };

describe(`VegaParser.parseAsync`, () => {
  function check(spec, useResize, expectedSpec, warnCount) {
    return async () => {
      const searchApiStub = {
        search: jest.fn(() => of({})),
        resetSearchStats: jest.fn(),
      };
      expectedSpec = expectedSpec || cloneDeep(spec);
      const mockGetServiceSettings = async () => {
        return {
          getFileLayers: async () => [],
          getUrlForRegionLayer: async (layer) => {
            return layer.url;
          },
        };
      };
      const vp = new VegaParser(spec, searchApiStub, 0, 0, mockGetServiceSettings, theme);
      await vp.parseAsync();
      expect(vp.warnings).toHaveLength(warnCount || 0);
      expect(vp.useResize).toEqual(useResize);
      expect(vp.vlspec).toEqual(expectedSpec);
    };
  }

  test(`should throw an error in case of $spec is not defined`, async () => {
    const vp = new VegaParser('{}', undefined, undefined, undefined, undefined, theme);

    await vp.parseAsync();

    expect(
      vp.error.startsWith('Your specification requires a "$schema" field with a valid URL')
    ).toBeTruthy();
  });

  test(
    `should apply autosize on layer spec`,
    check(
      {
        $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
        layer: [{ mark: 'bar' }],
        encoding: { x: { field: 'a' } },
      },
      true,
      expect.objectContaining({
        $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
        layer: [{ mark: 'bar' }],
        encoding: { x: { field: 'a' } },
        autosize: { type: 'fit', contains: 'padding' },
        width: 'container',
        height: 'container',
      })
    )
  );

  test(
    `should not apply autosize on faceted spec`,
    check(
      {
        $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
        mark: 'circle',
        encoding: { row: { field: 'a' } },
      },
      false,
      expect.not.objectContaining({
        autosize: { type: 'fit', contains: 'padding' },
      })
    )
  );

  test(`should return a specific error in case of $schema URL not valid`, async () => {
    const vp = new VegaParser(
      {
        $schema: 'https://vega.github.io/schema/vega-lite/v4.jsonanythingtobreakthis',
        mark: 'circle',
        encoding: { row: { field: 'a' } },
      },
      undefined,
      undefined,
      undefined,
      undefined,
      theme
    );

    await vp.parseAsync();

    expect(vp.error).toBe(
      'The URL for the JSON "$schema" is incorrect. Correct the URL, then click Update.'
    );
  });
});

describe(`VegaParser._setDefaultValue`, () => {
  function check(spec, expected, ...params) {
    return () => {
      const vp = new VegaParser(spec, undefined, undefined, undefined, undefined, theme);
      vp._setDefaultValue(...params);
      expect(vp.spec).toEqual(expected);
      expect(vp.warnings).toHaveLength(0);
    };
  }

  test(`empty`, check({}, { config: { test: 42 } }, 42, 'config', 'test'));
  test(`exists`, check({ config: { test: 42 } }, { config: { test: 42 } }, 1, 'config', 'test'));
  test(`exists non-obj`, check({ config: false }, { config: false }, 42, 'config', 'test'));
});

describe(`VegaParser._setDefaultColors`, () => {
  function check(spec, isVegaLite, expected) {
    return () => {
      const vp = new VegaParser(spec, undefined, undefined, undefined, undefined, theme);
      vp.isVegaLite = isVegaLite;
      vp._setDefaultColors();
      expect(vp.spec).toEqual(expected);
      expect(vp.warnings).toHaveLength(0);
    };
  }

  test(
    `vegalite`,
    check({}, true, {
      config: {
        axis: {
          domainColor: VegaThemeColors.borealis.light.grid,
          gridColor: VegaThemeColors.borealis.light.grid,
          tickColor: VegaThemeColors.borealis.light.grid,
        },
        background: 'transparent',
        range: { category: { scheme: 'elastic' } },
        mark: { color: VegaThemeColors.borealis.light.default },
        style: {
          'group-title': {
            fill: VegaThemeColors.borealis.light.title,
          },
          'guide-label': {
            fill: VegaThemeColors.borealis.light.label,
          },
          'guide-title': {
            fill: VegaThemeColors.borealis.light.title,
          },
          'group-subtitle': {
            fill: VegaThemeColors.borealis.light.title,
          },
        },
      },
    })
  );

  test(
    `vega`,
    check({}, false, {
      config: {
        axis: {
          domainColor: VegaThemeColors.borealis.light.grid,
          gridColor: VegaThemeColors.borealis.light.grid,
          tickColor: VegaThemeColors.borealis.light.grid,
        },
        background: 'transparent',
        range: { category: { scheme: 'elastic' } },
        arc: { fill: VegaThemeColors.borealis.light.default },
        area: { fill: VegaThemeColors.borealis.light.default },
        line: { stroke: VegaThemeColors.borealis.light.default },
        path: { stroke: VegaThemeColors.borealis.light.default },
        rect: { fill: VegaThemeColors.borealis.light.default },
        rule: { stroke: VegaThemeColors.borealis.light.default },
        shape: { stroke: VegaThemeColors.borealis.light.default },
        symbol: { fill: VegaThemeColors.borealis.light.default },
        trail: { fill: VegaThemeColors.borealis.light.default },
        style: {
          'group-title': {
            fill: VegaThemeColors.borealis.light.title,
          },
          'guide-label': {
            fill: VegaThemeColors.borealis.light.label,
          },
          'guide-title': {
            fill: VegaThemeColors.borealis.light.title,
          },
          'group-subtitle': {
            fill: VegaThemeColors.borealis.light.title,
          },
        },
      },
    })
  );
});

describe('VegaParser._resolveEsQueries', () => {
  let searchApiStub;
  const data = [
    {
      name: 'requestId',
      rawResponse: [42],
    },
  ];

  beforeEach(() => {
    searchApiStub = {
      search: jest.fn(() => ({
        toPromise: jest.fn(() => Promise.resolve(data)),
      })),
      resetSearchStats: jest.fn(),
    };
  });

  function check(spec, expected, warnCount) {
    return async () => {
      const mockGetServiceSettings = async () => {
        return {
          getFileLayers: async () => [{ name: 'file1', url: 'url1' }],
          getUrlForRegionLayer: async (layer) => {
            return layer.url;
          },
        };
      };
      const tc = new (class extends TimeCache {
        getTimeBounds() {
          return { min: 123456, max: 654321 };
        }
      })();
      const vp = new VegaParser(spec, searchApiStub, tc, 0, mockGetServiceSettings, theme);
      await vp._resolveDataUrls();

      expect(vp.spec).toEqual(expected);
      expect(vp.warnings).toHaveLength(warnCount || 0);
    };
  }

  test('no data', check({}, {}));
  test('no data2', check({ a: 1 }, { a: 1 }));
  test('non-es data', check({ data: { a: 10 } }, { data: { a: 10 } }));
  test(
    'es',
    check(
      { data: { name: 'requestId', url: { index: 'a' }, x: 1 } },
      { data: { name: 'requestId', url: { index: 'a', body: {} }, values: [42], x: 1 } }
    )
  );
  test(
    'es 2',
    check(
      { data: { name: 'requestId', url: { '%type%': 'elasticsearch', index: 'a' } } },
      { data: { name: 'requestId', url: { index: 'a', body: {} }, values: [42] } }
    )
  );
  test(
    'es arr',
    check(
      { arr: [{ data: { name: 'requestId', url: { index: 'a' }, x: 1 } }] },
      { arr: [{ data: { name: 'requestId', url: { index: 'a', body: {} }, values: [42], x: 1 } }] }
    )
  );
  test(
    'emsfile',
    check(
      { data: { url: { '%type%': 'emsfile', name: 'file1' } } },
      { data: { url: bypassExternalUrlCheck('url1') } }
    )
  );
  test(
    'timefilter_min',
    check(
      { data: { url: 'http://example.com?min=%timefilter_min%' } },
      { data: { url: 'http://example.com?min=123456' } }
    )
  );
  test(
    'timefilter_max',
    check(
      { data: { url: 'http://example.com?min=%timefilter_max%' } },
      { data: { url: 'http://example.com?min=654321' } }
    )
  );
});

describe('VegaParser.parseSchema', () => {
  function check(schema, isVegaLite) {
    return () => {
      const vp = new VegaParser(
        { $schema: schema },
        undefined,
        undefined,
        undefined,
        undefined,
        theme
      );
      expect(vp.parseSchema(vp.spec).isVegaLite).toBe(isVegaLite);
    };
  }

  test(
    'should not warn on current vega version',
    check('https://vega.github.io/schema/vega/v5.json', false, 0)
  );
  test(
    'should not warn on older vega version',
    check('https://vega.github.io/schema/vega/v4.json', false, 0)
  );
  test(
    'should warn on vega version too new to be supported',
    check('https://vega.github.io/schema/vega/v5.99.json', false, 1)
  );

  test(
    'should not warn on current vega-lite version',
    check('https://vega.github.io/schema/vega-lite/v4.json', true, 0)
  );
  test(
    'should warn on vega-lite version too new to be supported',
    check('https://vega.github.io/schema/vega-lite/v5.json', true, 1)
  );
});

describe('VegaParser._parseTooltips', () => {
  function check(tooltips, position, padding, centerOnMark, textTruncate = false) {
    return () => {
      const vp = new VegaParser(
        tooltips !== undefined ? { config: { kibana: { tooltips } } } : {},
        undefined,
        undefined,
        undefined,
        undefined,
        theme
      );
      vp._config = vp._parseConfig();
      if (position === undefined) {
        // error
        expect(() => vp._parseTooltips()).toThrow();
      } else if (position === false) {
        expect(vp._parseTooltips()).toEqual(false);
      } else {
        expect(vp._parseTooltips()).toEqual({ position, padding, centerOnMark, textTruncate });
      }
    };
  }

  test('undefined', check(undefined, 'top', 16, 50));
  test('{}', check({}, 'top', 16, 50));
  test('left', check({ position: 'left' }, 'left', 16, 50));
  test('padding', check({ position: 'bottom', padding: 60 }, 'bottom', 60, 50));
  test('padding2', check({ padding: 70 }, 'top', 70, 50));
  test('centerOnMark', check({}, 'top', 16, 50));
  test('centerOnMark=10', check({ centerOnMark: 10 }, 'top', 16, 10));
  test('centerOnMark=true', check({ centerOnMark: true }, 'top', 16, Number.MAX_VALUE));
  test('centerOnMark=false', check({ centerOnMark: false }, 'top', 16, -1));
  test('textTruncate=false', check({ textTruncate: true }, 'top', 16, 50, true));

  test('false', check(false, false));

  test('err1', check(true, undefined));
  test('err2', check({ position: 'foo' }, undefined));
  test('err3', check({ padding: 'foo' }, undefined));
  test('err4', check({ centerOnMark: {} }, undefined));
});

describe('VegaParser._parseMapConfig', () => {
  function check(config, expected, warnCount) {
    return () => {
      const vp = new VegaParser(undefined, undefined, undefined, undefined, undefined, theme);
      vp._config = config;
      expect(vp._parseMapConfig()).toEqual(expected);
      expect(vp.warnings).toHaveLength(warnCount);
    };
  }

  test(
    'empty',
    check(
      {},
      {
        delayRepaint: true,
        latitude: 0,
        longitude: 0,
        mapStyle: true,
        zoomControl: true,
        scrollWheelZoom: false,
      },
      0
    )
  );

  test(
    'emsTileServiceId',
    check(
      {
        mapStyle: true,
        emsTileServiceId: DEFAULT_EMS_DARKMAP_ID,
      },
      {
        delayRepaint: true,
        latitude: 0,
        longitude: 0,
        mapStyle: true,
        emsTileServiceId: DEFAULT_EMS_DARKMAP_ID,
        zoomControl: true,
        scrollWheelZoom: false,
      },
      0
    )
  );

  test(
    'filled',
    check(
      {
        delayRepaint: true,
        latitude: 0,
        longitude: 0,
        mapStyle: true,
        zoomControl: true,
        scrollWheelZoom: false,
        maxBounds: [1, 2, 3, 4],
      },
      {
        delayRepaint: true,
        latitude: 0,
        longitude: 0,
        mapStyle: true,
        zoomControl: true,
        scrollWheelZoom: false,
        maxBounds: [1, 2, 3, 4],
      },
      0
    )
  );
});

describe('VegaParser._parseConfig', () => {
  function check(spec, expectedConfig, expectedSpec, warnCount) {
    return async () => {
      expectedSpec = expectedSpec || cloneDeep(spec);
      const vp = new VegaParser(spec, undefined, undefined, undefined, undefined, theme);
      const config = await vp._parseConfig();
      expect(config).toEqual(expectedConfig);
      expect(vp.spec).toEqual(expectedSpec);
      expect(vp.warnings).toHaveLength(warnCount || 0);
    };
  }

  test('no config', check({}, {}, {}));
  test('simple config', check({ config: { a: 1 } }, {}));
  test('kibana config', check({ config: { kibana: { a: 1 } } }, { a: 1 }, { config: {} }));
  test('_hostConfig', check({ _hostConfig: { a: 1 } }, { a: 1 }, {}, 1));
});

describe('VegaParser._compileWithAutosize', () => {
  function check(spec, useResize, expectedSpec, warnCount) {
    return async () => {
      expectedSpec = expectedSpec || cloneDeep(spec);
      const vp = new VegaParser(spec, undefined, undefined, undefined, undefined, theme);
      vp._compileWithAutosize();
      expect(vp.useResize).toEqual(useResize);
      expect(vp.spec).toEqual(expectedSpec);
      expect(vp.warnings).toHaveLength(warnCount || 0);
    };
  }

  test(
    'empty config',
    check({}, true, {
      autosize: { type: 'fit', contains: 'padding' },
      width: 'container',
      height: 'container',
    })
  );
  test(
    'no warnings for default config',
    check({ width: 'container', height: 'container' }, true, {
      autosize: { type: 'fit', contains: 'padding' },
      width: 'container',
      height: 'container',
    })
  );
  test(
    'warning when attempting to use invalid setting',
    check(
      { width: '300', height: '300' },
      true,
      {
        autosize: { type: 'fit', contains: 'padding' },
        width: 'container',
        height: 'container',
      },
      1
    )
  );
  test(
    'autosize none',
    check({ autosize: 'none' }, false, { autosize: { type: 'none', contains: 'padding' } })
  );
  test(
    'autosize=fit',
    check({ autosize: 'fit' }, true, {
      autosize: { type: 'fit', contains: 'padding' },
      width: 'container',
      height: 'container',
    })
  );
  test(
    'autosize=pad',
    check({ autosize: 'pad' }, true, {
      autosize: { type: 'pad', contains: 'padding' },
      width: 'container',
      height: 'container',
    })
  );
  test(
    'empty autosize object',
    check({ autosize: {} }, true, {
      autosize: { type: 'fit', contains: 'padding' },
      height: 'container',
      width: 'container',
    })
  );
  test(
    'warning on falsy arguments',
    check(
      { autosize: false },
      true,
      {
        autosize: { type: 'fit', contains: 'padding' },
        height: 'container',
        width: 'container',
      },
      1
    )
  );
  test(
    'partial autosize object',
    check({ autosize: { contains: 'content' } }, true, {
      autosize: { contains: 'content', type: 'fit' },
      height: 'container',
      width: 'container',
    })
  );
  test('autosize signals are ignored', check({ autosize: { signal: 'asdf' } }, undefined));
});
