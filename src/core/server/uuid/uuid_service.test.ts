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

import { UuidService } from './uuid_service';
import { resolveInstanceUuid } from './resolve_uuid';
import { CoreContext } from '../core_context';

import { loggingServiceMock } from '../logging/logging_service.mock';
import { mockCoreContext } from '../core_context.mock';
import { Env } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';

jest.mock('./resolve_uuid', () => ({
  resolveInstanceUuid: jest.fn().mockResolvedValue('SOME_UUID'),
}));

describe('UuidService', () => {
  let logger: ReturnType<typeof loggingServiceMock.create>;
  let coreContext: CoreContext;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingServiceMock.create();
    coreContext = mockCoreContext.create({ logger });
  });

  describe('#setup()', () => {
    it('calls resolveInstanceUuid with core configuration service', async () => {
      const service = new UuidService(coreContext);
      await service.setup();
      expect(resolveInstanceUuid).toHaveBeenCalledTimes(1);
      expect(resolveInstanceUuid).toHaveBeenCalledWith({
        configService: coreContext.configService,
        syncToFile: true,
        logger: logger.get('uuid'),
      });
    });

    describe('when cliArgs.optimize is true', () => {
      it('calls resolveInstanceUuid with syncToFile: false', async () => {
        coreContext = mockCoreContext.create({
          logger,
          env: Env.createDefault(getEnvOptions({ cliArgs: { optimize: true } })),
        });
        const service = new UuidService(coreContext);
        await service.setup();
        expect(resolveInstanceUuid).toHaveBeenCalledTimes(1);
        expect(resolveInstanceUuid).toHaveBeenCalledWith({
          configService: coreContext.configService,
          syncToFile: false,
          logger: logger.get('uuid'),
        });
      });
    });

    it('returns the uuid resolved from resolveInstanceUuid', async () => {
      const service = new UuidService(coreContext);
      const setup = await service.setup();
      expect(setup.getInstanceUuid()).toEqual('SOME_UUID');
    });
  });
});
