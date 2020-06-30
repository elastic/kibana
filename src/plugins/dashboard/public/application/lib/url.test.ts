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

import { getDashboardIdFromUrl } from './url';

test('getDashboardIdFromUrl', () => {
  let url =
    "http://localhost:5601/wev/app/dashboards#/create?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
  expect(getDashboardIdFromUrl(url)).toEqual(undefined);

  url =
    "http://localhost:5601/wev/app/dashboards#/view/625357282?_a=(description:'',filters:!()&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))";
  expect(getDashboardIdFromUrl(url)).toEqual('625357282');

  url = 'http://myserver.mydomain.com:5601/wev/app/dashboards#/view/777182';
  expect(getDashboardIdFromUrl(url)).toEqual('777182');

  url =
    "http://localhost:5601/app/dashboards#/create?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!()";
  expect(getDashboardIdFromUrl(url)).toEqual(undefined);

  url = '/view/test/?_g=(refreshInterval:';
  expect(getDashboardIdFromUrl(url)).toEqual('test');

  url = 'view/test/?_g=(refreshInterval:';
  expect(getDashboardIdFromUrl(url)).toEqual('test');

  url = '/other-app/test/';
  expect(getDashboardIdFromUrl(url)).toEqual(undefined);
});
