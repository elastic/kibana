/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { send } from './es';
import { KIBANA_API_PREFIX } from '../../../common/constants';

describe('es', () => {
  describe('send', () => {
    describe('query params handling for Kibana API requests', () => {
      it('should handle repeated keys with different values as an array', async () => {
        const mockHttp = httpServiceMock.createSetupContract();

        await send({
          http: mockHttp,
          method: 'GET',
          path: `${KIBANA_API_PREFIX}/api/test?tag=first&tag=second&tag=third`,
        });

        expect(mockHttp.get).toHaveBeenCalledWith(
          '/api/test',
          expect.objectContaining({
            query: { tag: ['first', 'second', 'third'] },
          })
        );
      });

      it('should handle repeated keys with duplicate values as an array', async () => {
        const mockHttp = httpServiceMock.createSetupContract();

        await send({
          http: mockHttp,
          method: 'GET',
          path: `${KIBANA_API_PREFIX}/api/test?tag=same&tag=same`,
        });

        expect(mockHttp.get).toHaveBeenCalledWith(
          '/api/test',
          expect.objectContaining({
            query: { tag: ['same', 'same'] },
          })
        );
      });

      it('should handle mixed single and repeated keys', async () => {
        const mockHttp = httpServiceMock.createSetupContract();

        await send({
          http: mockHttp,
          method: 'GET',
          path: `${KIBANA_API_PREFIX}/api/test?single=value&multi=first&multi=second`,
        });

        expect(mockHttp.get).toHaveBeenCalledWith(
          '/api/test',
          expect.objectContaining({
            query: { single: 'value', multi: ['first', 'second'] },
          })
        );
      });
    });
  });
});
