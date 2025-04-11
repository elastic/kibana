/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('kibana server with ssl', function () {
    this.tags('skipFIPS');
    it('handles requests using ssl with a P12 keystore that uses an intermediate CA', async () => {
      await supertest.get('/').expect(302);
    });
  });
}
