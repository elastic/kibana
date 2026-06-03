/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import '@kbn/core-provider-plugin/types';
import type { Response } from 'supertest';
import type { PluginFunctionalProviderContext } from '../../services';

function getWireUtf8Body(res: Response): string {
  if (typeof res.text === 'string' && res.text.length > 0) {
    return res.text;
  }
  if (Buffer.isBuffer(res.body)) {
    return res.body.toString('utf8');
  }
  if (typeof res.body === 'string') {
    return res.body;
  }
  return res.body?.toString?.() ?? '';
}

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  // routes defined in the `core_http` test plugin
  describe('Custom errors', () => {
    it('can serve an error response from stream', async () => {
      await supertest
        .get('/api/core_http/error_stream')
        .expect(501)
        .then((response) => {
          // `supertest` does not always populate `response.text` for buffered/binary bodies; use
          // `getWireUtf8Body` so stream + buffer error payloads are asserted consistently.
          expect(getWireUtf8Body(response)).to.eql('error stream');
        });
    });

    it('can serve an error response from buffer', async () => {
      await supertest
        .get('/api/core_http/error_buffer')
        .expect(501)
        .then((response) => {
          expect(getWireUtf8Body(response)).to.eql('error buffer');
        });
    });
  });
}
