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

jest.mock('../', () => ({
  DashboardConstants: {
    ADD_EMBEDDABLE_ID: 'addEmbeddableId',
    ADD_EMBEDDABLE_TYPE: 'addEmbeddableType',
  },
}));

jest.mock('../legacy_imports', () => {
  return {
    absoluteToParsedUrl: jest.fn(() => {
      return {
        basePath: '/pep',
        appId: 'kibana',
        appPath: '/dashboard?addEmbeddableType=lens&addEmbeddableId=123eb456cd&x=1&y=2&z=3',
        hostname: 'localhost',
        port: 5601,
        protocol: 'http:',
        addQueryParameter: () => {},
        getAbsoluteUrl: () => {
          return 'http://localhost:5601/pep/app/kibana#/dashboard?addEmbeddableType=lens&addEmbeddableId=123eb456cd&x=1&y=2&z=3';
        },
      };
    }),
  };
});

import {
  addEmbeddableToDashboardUrl,
  getLensUrlFromDashboardAbsoluteUrl,
  getUrlVars,
} from '../np_ready/url_helper';

describe('Dashboard URL Helper', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('addEmbeddableToDashboardUrl', () => {
    const id = '123eb456cd';
    const type = 'lens';
    const urlVars = {
      x: '1',
      y: '2',
      z: '3',
    };
    const basePath = '/pep';
    const url =
      "http://localhost:5601/pep/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
    expect(addEmbeddableToDashboardUrl(url, basePath, id, urlVars, type)).toEqual(
      `http://localhost:5601/pep/app/kibana#/dashboard?addEmbeddableType=${type}&addEmbeddableId=${id}&x=1&y=2&z=3`
    );
  });

  it('getUrlVars', () => {
    let url =
      "http://localhost:5601/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
    expect(getUrlVars(url)).toEqual({
      _g: '(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))',
      _a: "(description:'',filters:!()",
    });
    url = 'http://mybusiness.mydomain.com/app/kibana#/dashboard?x=y&y=z';
    expect(getUrlVars(url)).toEqual({
      x: 'y',
      y: 'z',
    });
    url = 'http://localhost:5601/app/kibana#/dashboard/777182';
    expect(getUrlVars(url)).toEqual({});
    url =
      'http://localhost:5601/app/kibana#/dashboard/777182?title=Some%20Dashboard%20With%20Spaces';
    expect(getUrlVars(url)).toEqual({ title: 'Some Dashboard With Spaces' });
  });

  it('getLensUrlFromDashboardAbsoluteUrl', () => {
    const id = '1244';
    const basePath = '/wev';
    let url =
      "http://localhost:5601/wev/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
    expect(getLensUrlFromDashboardAbsoluteUrl(url, basePath, id)).toEqual(
      'http://localhost:5601/wev/app/kibana#/lens/edit/1244'
    );

    url =
      "http://localhost:5601/wev/app/kibana#/dashboard/625357282?_a=(description:'',filters:!()&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))";
    expect(getLensUrlFromDashboardAbsoluteUrl(url, basePath, id)).toEqual(
      'http://localhost:5601/wev/app/kibana#/lens/edit/1244'
    );

    url = 'http://myserver.mydomain.com:5601/wev/app/kibana#/dashboard/777182';
    expect(getLensUrlFromDashboardAbsoluteUrl(url, basePath, id)).toEqual(
      'http://myserver.mydomain.com:5601/wev/app/kibana#/lens/edit/1244'
    );

    url =
      "http://localhost:5601/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
    expect(getLensUrlFromDashboardAbsoluteUrl(url, '', id)).toEqual(
      'http://localhost:5601/app/kibana#/lens/edit/1244'
    );
  });
});
