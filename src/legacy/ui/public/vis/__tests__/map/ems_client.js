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

import expect from '@kbn/expect';
import { getEMSClient } from './ems_client_util';

describe('ems_client', () => {


  it('should get the tile service', async () => {

    const emsClient = getEMSClient();
    const tiles = await emsClient.getTMSServices();

    expect(tiles.length).to.be(3);


    const tileService = tiles[0];
    expect(await tileService.getUrlTemplate()).to.be('https://raster-style.foobar/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.x.x');

    expect (tileService.getHTMLAttribution()).to.be('<p><a rel="noreferrer noopener" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> | <a rel="noreferrer noopener" href="https://openmaptiles.org">OpenMapTiles</a> | <a rel="noreferrer noopener" href="https://www.maptiler.com">MapTiler</a> | <a rel="noreferrer noopener" href="https://www.elastic.co/elastic-maps-service">Elastic Maps Service</a></p>');
    expect (await tileService.getMinZoom()).to.be(0);
    expect (await tileService.getMaxZoom()).to.be(10);
    expect (tileService.hasId('road_map')).to.be(true);



  });

  it('.addQueryParams', async () => {

    const emsClient = getEMSClient();


    const tilesBefore = await emsClient.getTMSServices();
    const urlBefore = await tilesBefore[0].getUrlTemplate();
    expect(urlBefore).to.be('https://raster-style.foobar/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.x.x');

    emsClient.addQueryParams({
      'foo': 'bar'
    });
    let tiles = await emsClient.getTMSServices();
    let url = await tiles[0].getUrlTemplate();
    expect(url).to.be('https://raster-style.foobar/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.x.x&foo=bar');

    emsClient.addQueryParams({
      'foo': 'schmoo',
      'bar': 'foo'
    });
    tiles = await emsClient.getTMSServices();
    url = await tiles[0].getUrlTemplate();
    expect(url).to.be('https://raster-style.foobar/styles/osm-bright/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.x.x&foo=schmoo&bar=foo');


  });


  it('.getFileLayers', async () => {
    const emsClient = getEMSClient();
    const layers = await emsClient.getFileLayers();
    expect(layers.length).to.be(18);
  });

  it('.getFileLayers[0]', async () => {
    const emsClient = getEMSClient();
    const layers = await emsClient.getFileLayers();

    const layer = layers[0];
    expect(layer.getId()).to.be('world_countries');
    expect(layer.hasId('world_countries')).to.be(true);

    // expect(layer.hasId('World Countries')).to.be(true);//todo
    expect(layer.getHTMLAttribution()).to.be('<a href=http://www.naturalearthdata.com/about/terms-of-use>Made with NaturalEarth</a> | <a href=https://www.elastic.co/elastic-maps-service>Elastic Maps Service</a>');

    expect(layer.getHTMLAttribution()).to.be('<a href=http://www.naturalearthdata.com/about/terms-of-use>Made with NaturalEarth</a> | <a href=https://www.elastic.co/elastic-maps-service>Elastic Maps Service</a>');

    expect(layer.getDisplayName()).to.be('World Countries');

  });

  it('.getFileLayers[0] - localized (known)', async () => {
    const emsClient = getEMSClient({
      language: 'fr'
    });
    emsClient.addQueryParams({
      foo: 'bar'
    });
    const layers = await emsClient.getFileLayers();

    const layer = layers[0];
    expect(layer.getId()).to.be('world_countries');
    expect(layer.hasId('world_countries')).to.be(true);

    // expect(layer.hasId('World Countries')).to.be(true);//todo
    expect(layer.getHTMLAttribution()).to.be('<a href=http://www.naturalearthdata.com/about/terms-of-use>Made with NaturalEarth</a> | <a href=https://www.elastic.co/elastic-maps-service>Elastic Maps Service</a>');
    expect(layer.getDisplayName()).to.be('pays');


    const fields = layer.getFieldsInLanguage();
    expect(fields).to.eql([ { name: 'iso2',
      description: 'code ISO 3166-1 alpha-2 du pays',
      type: 'id' },
    { name: 'iso3',
      description: 'code ISO 3166-1 alpha-3',
      type: 'id' },
    { name: 'name', description: 'nom', type: 'property' } ]);

    expect(layer.getDefaultFormatType()).to.be('geojson');
    expect(layer.getDefaultFormatUrl()).to.be('https://vector-staging.maps.elastic.co/files/world_countries_v1.geo.json?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.x.x&foo=bar');


  });

  it('.getFileLayers[0] - localized (fallback)', async () => {
    const emsClient = getEMSClient({
      language: 'zz'//madeup
    });
    const layers = await emsClient.getFileLayers();

    const layer = layers[0];
    expect(layer.getId()).to.be('world_countries');
    expect(layer.hasId('world_countries')).to.be(true);

    // expect(layer.hasId('World Countries')).to.be(true);//todo
    expect(layer.getHTMLAttribution()).to.be('<a href=http://www.naturalearthdata.com/about/terms-of-use>Made with NaturalEarth</a> | <a href=https://www.elastic.co/elastic-maps-service>Elastic Maps Service</a>');
    expect(layer.getDisplayName()).to.be('World Countries');

    const fields = layer.getFieldsInLanguage();
    expect(fields).to.eql([ { name: 'iso2',
      description: 'ISO 3166-1 alpha-2 code',
      type: 'id' },
    { name: 'iso3',
      description: 'ISO 3166-1 alpha-3 code',
      type: 'id' },
    { name: 'name', description: 'name', type: 'property' } ]);


    expect((await layer.getEMSHotLink())).to.be('https://landing.foobar/?locale=zz#file/world_countries');

  });

  it('.findFileLayerById', async () => {
    const emsClient = getEMSClient();
    const layer = await emsClient.findFileLayerById('world_countries');
    expect(layer.getId()).to.be('world_countries');
    expect(layer.hasId('world_countries')).to.be(true);

  });

  it('.findTMSServiceById', async () => {
    const emsClient = getEMSClient();
    const tmsService = await emsClient.findTMSServiceById('road_map');
    expect(tmsService.getId()).to.be('road_map');

  });


});

