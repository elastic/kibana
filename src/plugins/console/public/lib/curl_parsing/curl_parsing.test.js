/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { detectCURL, parseCURL } from './curl';
import curlTests from './__fixtures__/curl_parsing.txt';

describe('CURL', () => {
  const notCURLS = ['sldhfsljfhs', 's;kdjfsldkfj curl -XDELETE ""', '{ "hello": 1 }'];
  _.each(notCURLS, function (notCURL, i) {
    test('cURL Detection - broken strings ' + i, function () {
      expect(detectCURL(notCURL)).toEqual(false);
    });
  });

  curlTests.split(/^=+$/m).forEach(function (fixture) {
    if (fixture.trim() === '') {
      return;
    }
    fixture = fixture.split(/^-+$/m);
    const name = fixture[0].trim();
    const curlText = fixture[1];
    const response = fixture[2].trim();

    test('cURL Detection - ' + name, function () {
      expect(detectCURL(curlText)).toBe(true);
      const r = parseCURL(curlText);
      expect(r).toEqual(response);
    });
  });
});
