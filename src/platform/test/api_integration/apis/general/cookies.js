/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('cookie handling', () => {
    it('allows non-strict cookies', () =>
      supertest
        .get('/')
        .set('cookie', 'test:80=value;test_80=value')
        .then((response) => {
          expect(response.text).not.to.contain('Invalid cookie header');
        }));

    it(`returns an error if the cookie can't be parsed`, () =>
      supertest
        .get('/')
        .set('cookie', 'a')
        .expect(400)
        .then((response) => {
          expect(response.text).to.contain('Invalid cookie header');
        }));
  });
}
