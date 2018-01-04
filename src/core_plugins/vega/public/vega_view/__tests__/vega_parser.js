import expect from 'expect.js';
import { VegaParser } from '../vega_parser';

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
      mark: { color: '#00A69B' }
    }
  }));

  it(`vega`, test({}, false, {
    config: {
      range: { category: { scheme: 'elastic' } },
      arc: { fill: '#00A69B' },
      area: { fill: '#00A69B' },
      line: { stroke: '#00A69B' },
      path: { stroke: '#00A69B' },
      rect: { fill: '#00A69B' },
      rule: { stroke: '#00A69B' },
      shape: { stroke: '#00A69B' },
      symbol: { fill: '#00A69B' },
      trail: { fill: '#00A69B' }
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
  it('es', test({ data: { url: { type: 'elasticsearch', index: 'a' } } }, { data: { values: [42] } }));
  it('es arr', test({ arr: [{ data: { url: { index: 'a' }, x: 1 } }] }, { arr: [{ data: { values: [42], x: 1 } }] }));
  it('emsfile', test({ data: { url: { type: 'emsfile', name: 'file1' } } }, { data: { url: 'url1' } }));
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
      vp.config = config;
      expect(vp._parseMapConfig()).to.eql(expected);
      expect(vp.warnings).to.have.length(warnCount);
    };
  }

  it('empty', test({}, {
    delayRepaint: true,
    latitude: 0,
    longitude: 0,
    mapStyle: 'default',
    zoomControl: true
  }, 0));

  it('filled', test({
    delayRepaint: true,
    latitude: 0,
    longitude: 0,
    mapStyle: 'default',
    zoomControl: true,
    maxBounds: [1, 2, 3, 4],
  }, {
    delayRepaint: true,
    latitude: 0,
    longitude: 0,
    mapStyle: 'default',
    zoomControl: true,
    maxBounds: [1, 2, 3, 4],
  }, 0));

  it('warnings', test({
    delayRepaint: true,
    latitude: 0,
    longitude: 0,
    zoom: 'abc', // ignored
    mapStyle: 'abc',
    zoomControl: 'abc',
    maxBounds: [2, 3, 4],
  }, {
    delayRepaint: true,
    latitude: 0,
    longitude: 0,
    mapStyle: 'default',
    zoomControl: true,
  }, 4));
});
