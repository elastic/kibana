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

import _ from 'lodash';
import expect from '@kbn/expect';
import { VegaParser } from '../vega_parser';
import { bypassExternalUrlCheck } from '../../vega_view/vega_base_view';

describe(`VegaParser._setDefaultValue`, () => {
  function test(spec, expected, ...params) {
    return () => {
      const vp = new VegaParser(spec);
      vp._setDefaultValue(...params);
      expect(vp.spec).to.eql(expected);
      expect(vp.warnings).to.have.length(0);
    };
  }

  it(`empty`, test({}, { config: { test: 42 } }, 42, 'config', 'test'));
  it(`exists`, test({ config: { test: 42 } }, { config: { test: 42 } }, 1, 'config', 'test'));
  it(`exists non-obj`, test({ config: false }, { config: false }, 42, 'config', 'test'));
});

describe(`VegaParser._setDefaultColors`, () => {
  function test(spec, isVegaLite, expected) {
    return () => {
      const vp = new VegaParser(spec);
      vp.isVegaLite = isVegaLite;
      vp._setDefaultColors();
      expect(vp.spec).to.eql(expected);
      expect(vp.warnings).to.have.length(0);
    };
  }

  it(
    `vegalite`,
    test({}, true, {
      config: {
        range: { category: { scheme: 'elastic' } },
        mark: { color: '#54B399' },
      },
    })
  );

  it(
    `vega`,
    test({}, false, {
      config: {
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
      },
    })
  );
});

describe('VegaParser._resolveEsQueries', () => {
  function test(spec, expected, warnCount) {
    return async () => {
      const vp = new VegaParser(spec, { search: async () => [[42]] }, 0, 0, {
        getFileLayers: async () => [{ name: 'file1', url: 'url1' }],
        getUrlForRegionLayer: async layer => {
          return layer.url;
        },
      });
      await vp._resolveDataUrls();

      expect(vp.spec).to.eql(expected);
      expect(vp.warnings).to.have.length(warnCount || 0);
    };
  }

  it('no data', test({}, {}));
  it('no data2', test({ a: 1 }, { a: 1 }));
  it('non-es data', test({ data: { a: 10 } }, { data: { a: 10 } }));
  it('es', test({ data: { url: { index: 'a' }, x: 1 } }, { data: { values: [42], x: 1 } }));
  it(
    'es',
    test({ data: { url: { '%type%': 'elasticsearch', index: 'a' } } }, { data: { values: [42] } })
  );
  it(
    'es arr',
    test(
      { arr: [{ data: { url: { index: 'a' }, x: 1 } }] },
      { arr: [{ data: { values: [42], x: 1 } }] }
    )
  );
  it(
    'emsfile',
    test(
      { data: { url: { '%type%': 'emsfile', name: 'file1' } } },
      { data: { url: bypassExternalUrlCheck('url1') } }
    )
  );
});

describe('VegaParser._parseSchema', () => {
  function test(schema, isVegaLite, warningCount) {
    return () => {
      const vp = new VegaParser({ $schema: schema });
      expect(vp._parseSchema()).to.be(isVegaLite);
      expect(vp.spec).to.eql({ $schema: schema });
      expect(vp.warnings).to.have.length(warningCount);
    };
  }

  it('should warn on no vega version specified', () => {
    const vp = new VegaParser({});
    expect(vp._parseSchema()).to.be(false);
    expect(vp.spec).to.eql({ $schema: 'https://vega.github.io/schema/vega/v3.0.json' });
    expect(vp.warnings).to.have.length(1);
  });

  it(
    'should not warn on current vega version',
    test('https://vega.github.io/schema/vega/v4.0.json', false, 0)
  );
  it(
    'should not warn on older vega version',
    test('https://vega.github.io/schema/vega/v3.0.json', false, 0)
  );
  it(
    'should warn on vega version too new to be supported',
    test('https://vega.github.io/schema/vega/v5.0.json', false, 1)
  );

  it(
    'should not warn on current vega-lite version',
    test('https://vega.github.io/schema/vega-lite/v2.0.json', true, 0)
  );
  it(
    'should warn on vega-lite version too new to be supported',
    test('https://vega.github.io/schema/vega-lite/v3.0.json', true, 1)
  );
});

describe('VegaParser._parseTooltips', () => {
  function test(tooltips, position, padding, centerOnMark) {
    return () => {
      const vp = new VegaParser(tooltips !== undefined ? { config: { kibana: { tooltips } } } : {});
      vp._config = vp._parseConfig();
      if (position === undefined) {
        // error
        expect(() => vp._parseTooltips()).to.throwError();
      } else if (position === false) {
        expect(vp._parseTooltips()).to.eql(false);
      } else {
        expect(vp._parseTooltips()).to.eql({ position, padding, centerOnMark });
      }
    };
  }

  it('undefined', test(undefined, 'top', 16, 50));
  it('{}', test({}, 'top', 16, 50));
  it('left', test({ position: 'left' }, 'left', 16, 50));
  it('padding', test({ position: 'bottom', padding: 60 }, 'bottom', 60, 50));
  it('padding2', test({ padding: 70 }, 'top', 70, 50));
  it('centerOnMark', test({}, 'top', 16, 50));
  it('centerOnMark=10', test({ centerOnMark: 10 }, 'top', 16, 10));
  it('centerOnMark=true', test({ centerOnMark: true }, 'top', 16, Number.MAX_VALUE));
  it('centerOnMark=false', test({ centerOnMark: false }, 'top', 16, -1));

  it('false', test(false, false));

  it('err1', test(true, undefined));
  it('err2', test({ position: 'foo' }, undefined));
  it('err3', test({ padding: 'foo' }, undefined));
  it('err4', test({ centerOnMark: {} }, undefined));
});

describe('VegaParser._parseMapConfig', () => {
  function test(config, expected, warnCount) {
    return () => {
      const vp = new VegaParser();
      vp._config = config;
      expect(vp._parseMapConfig()).to.eql(expected);
      expect(vp.warnings).to.have.length(warnCount);
    };
  }

  it(
    'empty',
    test(
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

  it(
    'filled',
    test(
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

  it(
    'warnings',
    test(
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
  function test(spec, expectedConfig, expectedSpec, warnCount) {
    return async () => {
      expectedSpec = expectedSpec || _.cloneDeep(spec);
      const vp = new VegaParser(spec);
      const config = await vp._parseConfig();
      expect(config).to.eql(expectedConfig);
      expect(vp.spec).to.eql(expectedSpec);
      expect(vp.warnings).to.have.length(warnCount || 0);
    };
  }

  it('no config', test({}, {}, {}));
  it('simple config', test({ config: { a: 1 } }, {}));
  it('kibana config', test({ config: { kibana: { a: 1 } } }, { a: 1 }, { config: {} }));
  it('_hostConfig', test({ _hostConfig: { a: 1 } }, { a: 1 }, {}, 1));
});

describe('VegaParser._calcSizing', () => {
  function test(spec, useResize, paddingWidth, paddingHeight, isVegaLite, expectedSpec, warnCount) {
    return async () => {
      expectedSpec = expectedSpec || _.cloneDeep(spec);
      const vp = new VegaParser(spec);
      vp.isVegaLite = !!isVegaLite;
      vp._calcSizing();
      expect(vp.useResize).to.eql(useResize);
      expect(vp.paddingWidth).to.eql(paddingWidth);
      expect(vp.paddingHeight).to.eql(paddingHeight);
      expect(vp.spec).to.eql(expectedSpec);
      expect(vp.warnings).to.have.length(warnCount || 0);
    };
  }

  it('no size', test({ autosize: {} }, false, 0, 0));
  it('fit', test({ autosize: 'fit' }, true, 0, 0));
  it('fit obj', test({ autosize: { type: 'fit' } }, true, 0, 0));
  it('padding const', test({ autosize: 'fit', padding: 10 }, true, 20, 20));
  it(
    'padding obj',
    test({ autosize: 'fit', padding: { left: 5, bottom: 7, right: 6, top: 8 } }, true, 11, 15)
  );
  it('width height', test({ autosize: 'fit', width: 1, height: 2 }, true, 0, 0, false, false, 1));
  it(
    'VL width height',
    test({ autosize: 'fit', width: 1, height: 2 }, true, 0, 0, true, { autosize: 'fit' }, 0)
  );
});
