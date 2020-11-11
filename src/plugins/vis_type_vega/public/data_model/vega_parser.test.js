/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { cloneDeep } from 'lodash';
import { euiThemeVars } from '@kbn/ui-shared-deps/theme';
import { VegaParser } from './vega_parser';
import { bypassExternalUrlCheck } from '../vega_view/vega_base_view';

jest.mock('../services');

jest.mock('../lib/vega', () => ({
  vega: jest.requireActual('vega'),
  vegaLite: jest.requireActual('vega-lite'),
}));

describe(`VegaParser.parseAsync`, () => {
  test(`should throw an error in case of $spec is not defined`, async () => {
    const vp = new VegaParser('{}');

    await vp.parseAsync();

    expect(
      vp.error.startsWith('Your specification requires a "$schema" field with a valid URL')
    ).toBeTruthy();
  });
});

describe(`VegaParser._setDefaultValue`, () => {
  function check(spec, expected, ...params) {
    return () => {
      const vp = new VegaParser(spec);
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
      const vp = new VegaParser(spec);
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
          domainColor: euiThemeVars.euiColorChartLines,
          gridColor: euiThemeVars.euiColorChartLines,
          tickColor: euiThemeVars.euiColorChartLines,
        },
        background: 'transparent',
        range: { category: { scheme: 'elastic' } },
        mark: { color: '#54B399' },
        style: {
          'group-title': {
            fill: euiThemeVars.euiColorDarkestShade,
          },
          'guide-label': {
            fill: euiThemeVars.euiColorDarkShade,
          },
          'guide-title': {
            fill: euiThemeVars.euiColorDarkestShade,
          },
          'group-subtitle': {
            fill: euiThemeVars.euiColorDarkestShade,
          },
        },
        title: {
          color: euiThemeVars.euiColorDarkestShade,
        },
      },
    })
  );

  test(
    `vega`,
    check({}, false, {
      config: {
        axis: {
          domainColor: euiThemeVars.euiColorChartLines,
          gridColor: euiThemeVars.euiColorChartLines,
          tickColor: euiThemeVars.euiColorChartLines,
        },
        background: 'transparent',
        range: { category: { scheme: 'elastic' } },
        arc: { fill: '#54B399' },
        area: { fill: '#54B399' },
        line: { stroke: '#54B399' },
        path: { stroke: '#54B399' },
        rect: { fill: '#54B399' },
        rule: { stroke: '#54B399' },
        shape: { stroke: '#54B399' },
        symbol: { fill: '#54B399' },
        trail: { fill: '#54B399' },
        style: {
          'group-title': {
            fill: euiThemeVars.euiColorDarkestShade,
          },
          'guide-label': {
            fill: euiThemeVars.euiColorDarkShade,
          },
          'guide-title': {
            fill: euiThemeVars.euiColorDarkestShade,
          },
          'group-subtitle': {
            fill: euiThemeVars.euiColorDarkestShade,
          },
        },
        title: {
          color: euiThemeVars.euiColorDarkestShade,
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
      rawResponse: { hits: { total: 1 } },
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
      const vp = new VegaParser(spec, searchApiStub, 0, 0, mockGetServiceSettings);
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
      { data: { name: 'requestId', values: { hits: { total: 1 } }, x: 1 } }
    )
  );
  test(
    'es 2',
    check(
      { data: { name: 'requestId', url: { '%type%': 'elasticsearch', index: 'a' } } },
      { data: { name: 'requestId', values: { hits: { total: 1 } } } }
    )
  );
  test(
    'es arr',
    check(
      { arr: [{ data: { name: 'requestId', url: { index: 'a' }, x: 1 } }] },
      { arr: [{ data: { name: 'requestId', values: { hits: { total: 1 } }, x: 1 } }] }
    )
  );
  test(
    'emsfile',
    check(
      { data: { url: { '%type%': 'emsfile', name: 'file1' } } },
      { data: { url: bypassExternalUrlCheck('url1') } }
    )
  );
});

describe('VegaParser.parseSchema', () => {
  function check(schema, isVegaLite) {
    return () => {
      const vp = new VegaParser({ $schema: schema });
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
      const vp = new VegaParser(tooltips !== undefined ? { config: { kibana: { tooltips } } } : {});
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
      const vp = new VegaParser();
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
        mapStyle: 'default',
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
        mapStyle: 'default',
        zoomControl: true,
        scrollWheelZoom: false,
        maxBounds: [1, 2, 3, 4],
      },
      {
        delayRepaint: true,
        latitude: 0,
        longitude: 0,
        mapStyle: 'default',
        zoomControl: true,
        scrollWheelZoom: false,
        maxBounds: [1, 2, 3, 4],
      },
      0
    )
  );

  test(
    'warnings',
    check(
      {
        delayRepaint: true,
        latitude: 0,
        longitude: 0,
        zoom: 'abc', // ignored
        mapStyle: 'abc',
        zoomControl: 'abc',
        scrollWheelZoom: 'abc',
        maxBounds: [2, 3, 4],
      },
      {
        delayRepaint: true,
        latitude: 0,
        longitude: 0,
        mapStyle: 'default',
        zoomControl: true,
        scrollWheelZoom: false,
      },
      5
    )
  );
});

describe('VegaParser._parseConfig', () => {
  function check(spec, expectedConfig, expectedSpec, warnCount) {
    return async () => {
      expectedSpec = expectedSpec || cloneDeep(spec);
      const vp = new VegaParser(spec);
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
      const vp = new VegaParser(spec);
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
