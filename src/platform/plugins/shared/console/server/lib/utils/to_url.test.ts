/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toURL } from './to_url';

describe('toURL', () => {
  it('should replace + sign in query params with %2b', () => {
    const urlResult = toURL(
      'http://nowhere.none',
      'test/?q=create_date:[2020-05-10T08:00:00.000+08:00 TO *]'
    );
    expect(urlResult.search).toEqual(
      '?q=create_date%3A%5B2020-05-10T08%3A00%3A00.000%2B08%3A00+TO+*%5D&pretty=true'
    );
  });

  describe('with a path without the "pretty" search param', () => {
    it('should append the "pretty" search param', () => {
      const urlResult = toURL('http://nowhere.none', 'test');
      expect(urlResult.href).toEqual('http://nowhere.none/test?pretty=true');
    });
  });

  it('should handle encoding pathname', () => {
    const urlResult = toURL(
      'http://nowhere.none',
      '/%{[@metadata][beat]}-%{[@metadata][version]}-2020.08.23'
    );
    expect(urlResult.pathname).toEqual(
      '/%25%7B%5B%40metadata%5D%5Bbeat%5D%7D-%25%7B%5B%40metadata%5D%5Bversion%5D%7D-2020.08.23'
    );
  });
});
