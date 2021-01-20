/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
