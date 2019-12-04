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

jest.unmock('./rendering_service');

import {
  mockRenderingServiceParams,
  mockRenderingSetupDeps,
  mockGetRenderingProviderParams,
} from './__mocks__/params';
import { RenderingServiceSetup } from './types';
import { RenderingService } from './rendering_service';

describe('RenderingService', () => {
  let service: RenderingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RenderingService(mockRenderingServiceParams);
  });

  describe('setup()', () => {
    it('creates instance of RenderingServiceSetup', async () => {
      const rendering = await service.setup(mockRenderingSetupDeps);

      expect(rendering.getRenderingProvider).toBeInstanceOf(Function);
    });

    describe('getRenderingProvider()', () => {
      let rendering: RenderingServiceSetup;

      beforeEach(async () => {
        rendering = await service.setup(mockRenderingSetupDeps);
      });

      it('creates instance of RenderingProvider', async () => {
        const provider = rendering.getRenderingProvider(mockGetRenderingProviderParams);

        expect(provider.render).toBeInstanceOf(Function);
      });
    });

    describe('variable providers', () => {
      let rendering: RenderingServiceSetup;

      beforeEach(async () => {
        rendering = await service.setup(mockRenderingSetupDeps);
      });

      it('registers variable providers and returns provided variables', async () => {
        const varProvider = jest.fn().mockResolvedValue({ providedBy: 'core' });

        rendering.registerVarProvider('core', varProvider);

        const vars = await rendering.getVarsFor('core');

        expect(varProvider).toHaveBeenCalled();
        expect(vars).toMatchInlineSnapshot(`
          Object {
            "providedBy": "core",
          }
        `);
      });
    });
  });
});
