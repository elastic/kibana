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

import { addEmbeddableToDashboardUrl } from './url_helper';

describe('', () => {
  it('addEmbeddableToDashboardUrl when dashboard is not saved', () => {
    const id = '123eb456cd';
    const url =
      "/pep/app/dashboards#/create?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!())";
    expect(addEmbeddableToDashboardUrl(url, id, 'visualization')).toEqual(
      `/pep/app/dashboards#/create?_a=%28description%3A%27%27%2Cfilters%3A%21%28%29%29&_g=%28refreshInterval%3A%28pause%3A%21t%2Cvalue%3A0%29%2Ctime%3A%28from%3Anow-15m%2Cto%3Anow%29%29&addEmbeddableId=${id}&addEmbeddableType=visualization`
    );
  });
  it('addEmbeddableToDashboardUrl when dashboard is saved', () => {
    const id = '123eb456cd';
    const url =
      "/pep/app/dashboards#/view/9b780cd0-3dd3-11e8-b2b9-5d5dc1715159?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!())";
    expect(addEmbeddableToDashboardUrl(url, id, 'visualization')).toEqual(
      `/pep/app/dashboards#/view/9b780cd0-3dd3-11e8-b2b9-5d5dc1715159?_a=%28description%3A%27%27%2Cfilters%3A%21%28%29%29&_g=%28refreshInterval%3A%28pause%3A%21t%2Cvalue%3A0%29%2Ctime%3A%28from%3Anow-15m%2Cto%3Anow%29%29&addEmbeddableId=${id}&addEmbeddableType=visualization`
    );
  });
});
