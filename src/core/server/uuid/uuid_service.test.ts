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

jest.mock('./resolve_uuid', () => ({
  resolveInstanceUuid: jest.fn().mockResolvedValue('SOME_UUID'),
}));

describe('UuidService', () => {
  let logger: ReturnType<typeof loggingServiceMock.create>;
  let coreContext: CoreContext;
  let service: UuidService;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingServiceMock.create();
    coreContext = mockCoreContext.create({ logger });
    service = new UuidService(coreContext);
  });

  describe('#setup()', () => {
    it('calls manageInstanceUuid with core configuration service', async () => {
      await service.setup();
      expect(resolveInstanceUuid).toHaveBeenCalledTimes(1);
      expect(resolveInstanceUuid).toHaveBeenCalledWith(
        coreContext.configService,
        logger.get('uuid')
      );
    });

    it('returns the uuid resolved from manageInstanceUuid', async () => {
      const setup = await service.setup();
      expect(setup.getInstanceUuid()).toEqual('SOME_UUID');
    });
  });
});
