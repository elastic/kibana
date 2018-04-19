import _ from 'lodash';
import expect from 'expect.js';
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

  it(`vegalite`, test({}, true, {
    config: {
      range: { category: { scheme: 'elastic' } },
      mark: { color: '#00B3A4' }
    }
  }));

  it(`vega`, test({}, false, {
    config: {
      range: { category: { scheme: 'elastic' } },
      arc: { fill: '#00B3A4' },
      area: { fill: '#00B3A4' },
      line: { stroke: '#00B3A4' },
      path: { stroke: '#00B3A4' },
      rect: { fill: '#00B3A4' },
      rule: { stroke: '#00B3A4' },
      shape: { stroke: '#00B3A4' },
      symbol: { fill: '#00B3A4' },
      trail: { fill: '#00B3A4' }
    }
  }));

});

describe('VegaParser._resolveEsQueries', () => {
  function test(spec, expected, warnCount) {
    return async () => {
      const vp = new VegaParser(spec, { search: async () => [[42]] }, 0, 0, {
        getFileLayers: async () => [{ name: 'file1', url: 'url1' }]
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
  it('es', test({ data: { url: { '%type%': 'elasticsearch', index: 'a' } } }, { data: { values: [42] } }));
  it('es arr', test({ arr: [{ data: { url: { index: 'a' }, x: 1 } }] }, { arr: [{ data: { values: [42], x: 1 } }] }));
  it('emsfile', test(
    { data: { url: { '%type%': 'emsfile', name: 'file1' } } },
    { data: { url: bypassExternalUrlCheck('url1') } }));
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

  it('no schema', () => {
    const vp = new VegaParser({});
    expect(vp._parseSchema()).to.be(false);
    expect(vp.spec).to.eql({ $schema: 'https://vega.github.io/schema/vega/v3.0.json' });
    expect(vp.warnings).to.have.length(1);
  });
  it('vega', test('https://vega.github.io/schema/vega/v3.0.json', false, 0));
  it('vega old', test('https://vega.github.io/schema/vega/v4.0.json', false, 1));
  it('vega-lite', test('https://vega.github.io/schema/vega-lite/v2.0.json', true, 0));
  it('vega-lite old', test('https://vega.github.io/schema/vega-lite/v3.0.json', true, 1));
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

  it('empty', test({}, {
    delayRepaint: true,
    latitude: 0,
    longitude: 0,
    mapStyle: 'default',
    zoomControl: true,
    scrollWheelZoom: true,
  }, 0));

  it('filled', test({
    delayRepaint: true,
    latitude: 0,
    longitude: 0,
    mapStyle: 'default',
    zoomControl: true,
    scrollWheelZoom: true,
    maxBounds: [1, 2, 3, 4],
  }, {
    delayRepaint: true,
    latitude: 0,
    longitude: 0,
    mapStyle: 'default',
    zoomControl: true,
    scrollWheelZoom: true,
    maxBounds: [1, 2, 3, 4],
  }, 0));

  it('warnings', test({
    delayRepaint: true,
    latitude: 0,
    longitude: 0,
    zoom: 'abc', // ignored
    mapStyle: 'abc',
    zoomControl: 'abc',
    scrollWheelZoom: 'abc',
    maxBounds: [2, 3, 4],
  }, {
    delayRepaint: true,
    latitude: 0,
    longitude: 0,
    mapStyle: 'default',
    zoomControl: true,
    scrollWheelZoom: true,
  }, 5));
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
  it('padding obj', test({ autosize: 'fit', padding: { left: 5, bottom: 7, right: 6, top: 8 } }, true, 11, 15));
  it('width height', test({ autosize: 'fit', width: 1, height: 2 }, true, 0, 0, false, false, 1));
  it('VL width height', test({ autosize: 'fit', width: 1, height: 2 }, true, 0, 0, true, { autosize: 'fit' }, 0));
});
