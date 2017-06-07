import expect from 'expect.js';
import ngMock from 'ng_mock';
import url from 'url';

describe('tilemaptest - TileMapSettingsTests-mocked', function () {
  let tilemapSettings;
  let tilemapsConfig;
  let loadSettings;

  beforeEach(ngMock.module('kibana', ($provide) => {
    $provide.decorator('tilemapsConfig', () => ({
      manifestServiceUrl: 'http://foo.bar/manifest',
      deprecated: {
        isOverridden: false,
        config: {
          url: '',
          options: {
            minZoom: 1,
            maxZoom: 10,
            attribution: '© [Elastic Tile Service](https://www.elastic.co/elastic_tile_service)'
          }
        },
      }
    }));
  }));

  beforeEach(ngMock.inject(($injector, $httpBackend) => {
    tilemapSettings = $injector.get('tilemapSettings');
    tilemapsConfig = $injector.get('tilemapsConfig');

    loadSettings = (expectedUrl) => {
      // body and headers copied from https://proxy-tiles.elastic.co/v1/manifest
      const MANIFEST_BODY = `{
        "services":[
          {
            "id":"road_map",
            "url":"https://proxy-tiles.elastic.co/v1/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana",
            "minZoom":0,
            "maxZoom":12,
            "attribution":"© [Elastic Tile Service](https://www.elastic.co/elastic-tile-service)"
          }
        ]
      }`;

      const MANIFEST_HEADERS = {
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-origin': '*',
        'content-length': `${MANIFEST_BODY.length}`,
        'content-type': 'application/json; charset=utf-8',
        date: (new Date()).toUTCString(),
        server: 'tileprox/20170102101655-a02e54d',
        status: '200',
      };

      $httpBackend
        .expect('GET', expectedUrl ? expectedUrl : () => true)
        .respond(MANIFEST_BODY, MANIFEST_HEADERS);

      tilemapSettings.loadSettings();

      $httpBackend.flush();
    };
  }));

  afterEach(ngMock.inject($httpBackend => {
    $httpBackend.verifyNoOutstandingRequest();
    $httpBackend.verifyNoOutstandingExpectation();
  }));

  describe('getting settings', function () {
    beforeEach(() => {
      loadSettings();
    });


    it('should get url', async function () {

      const mapUrl = tilemapSettings.getUrl();
      expect(mapUrl).to.contain('{x}');
      expect(mapUrl).to.contain('{y}');
      expect(mapUrl).to.contain('{z}');

      const urlObject = url.parse(mapUrl, true);
      expect(urlObject).to.have.property('hostname', 'proxy-tiles.elastic.co');
      expect(urlObject.query).to.have.property('my_app_name', 'kibana');
      expect(urlObject.query).to.have.property('elastic_tile_service_tos', 'agree');
      expect(urlObject.query).to.have.property('my_app_version');

    });

    it('should get options', async function () {
      const options = tilemapSettings.getTMSOptions();
      expect(options).to.have.property('minZoom', 0);
      expect(options).to.have.property('maxZoom', 12);
      expect(options).to.have.property('attribution').contain('&#169;'); // html entity for ©, ensures that attribution is escaped
    });

  });

  describe('modify', function () {
    function assertQuery(expected) {
      const mapUrl = tilemapSettings.getUrl();
      const urlObject = url.parse(mapUrl, true);
      Object.keys(expected).forEach(key => {
        expect(urlObject.query).to.have.property(key, expected[key]);
      });
    }

    it('accepts an object', () => {
      tilemapSettings.addQueryParams({ foo: 'bar' });
      loadSettings();
      assertQuery({ foo: 'bar' });
    });

    it('merged additions with previous values', () => {
      // ensure that changes are always additive
      tilemapSettings.addQueryParams({ foo: 'bar' });
      tilemapSettings.addQueryParams({ bar: 'stool' });
      loadSettings();
      assertQuery({ foo: 'bar', bar: 'stool' });
    });

    it('overwrites conflicting previous values', () => {
      // ensure that conflicts are overwritten
      tilemapSettings.addQueryParams({ foo: 'bar' });
      tilemapSettings.addQueryParams({ bar: 'stool' });
      tilemapSettings.addQueryParams({ foo: 'tstool' });
      loadSettings();
      assertQuery({ foo: 'tstool', bar: 'stool' });
    });

    it('merges query params into manifest request', () => {
      tilemapSettings.addQueryParams({ foo: 'bar' });
      tilemapsConfig.manifestServiceUrl = 'http://test.com/manifest?v=1';
      loadSettings('http://test.com/manifest?v=1&my_app_version=1.2.3&foo=bar');
    });

  });

});
