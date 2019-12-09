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

import { load } from 'cheerio';

import { INJECTED_METADATA } from '../test_utils';
import {
  mockRenderingServiceParams,
  mockRenderingSetupDeps,
  mockRenderingProviderParams,
} from './__mocks__/params';
import { RenderingServiceSetup } from './types';
import { RenderingService } from './rendering_service';

describe('RenderingService', () => {
  let service: RenderingService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRenderingProviderParams.uiSettings.getAll.mockResolvedValue({ all: 'settings' });
    mockRenderingProviderParams.uiSettings.getUserProvided.mockResolvedValue({
      providedBy: {
        isOverridden: true,
        value: 'user',
      },
    });
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

      it('creates rendering provider', async () => {
        const provider = rendering.getRenderingProvider(mockRenderingProviderParams);

        expect(provider.render).toBeInstanceOf(Function);
      });

      describe('render()', () => {
        it('renders "core" page', async () => {
          const { render } = rendering.getRenderingProvider(mockRenderingProviderParams);
          const dom = load(await render());
          const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

          expect(data).toMatchSnapshot(INJECTED_METADATA);
        });

        it('renders with custom injectedVarsOverrides', async () => {
          const { render } = rendering.getRenderingProvider({
            ...mockRenderingProviderParams,
            injectedVarsOverrides: {
              fake: '__TEST_TOKEN__',
            },
          });
          const dom = load(await render());
          const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

          expect(data).toMatchSnapshot(INJECTED_METADATA);
        });

        it('renders with excluded user settings', async () => {
          const { render } = rendering.getRenderingProvider(mockRenderingProviderParams);
          const dom = load(await render(undefined, { includeUserSettings: false }));
          const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

          expect(data).toMatchSnapshot(INJECTED_METADATA);
        });
      });
    });
  });
});
