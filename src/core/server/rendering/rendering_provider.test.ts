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

jest.unmock('./rendering_provider');

import { load } from 'cheerio';

import { INJECTED_METADATA } from '../test_utils';
import { RenderingProvider } from './rendering_provider';
import { mockRenderingProviderParams } from './__mocks__/params';

describe('RenderingProvider', () => {
  describe('render()', () => {
    let rendering: RenderingProvider;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRenderingProviderParams.uiSettings.getAll.mockResolvedValue({ all: 'settings' });
      mockRenderingProviderParams.uiSettings.getUserProvided.mockResolvedValue({
        providedBy: {
          isOverridden: true,
          value: 'user',
        },
      });

      rendering = new RenderingProvider(mockRenderingProviderParams);
    });

    it('renders "core" page', async () => {
      const dom = load(await rendering.render());
      const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

      expect(data).toMatchSnapshot(INJECTED_METADATA);
    });

    it('renders with custom injectedVarsOverrides', async () => {
      rendering = new RenderingProvider({
        ...mockRenderingProviderParams,
        injectedVarsOverrides: {
          fake: '__TEST_TOKEN__',
        },
      });
      const dom = load(await rendering.render());
      const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

      expect(data).toMatchSnapshot(INJECTED_METADATA);
    });

    it('renders with excluded user settings', async () => {
      const dom = load(await rendering.render(undefined, false));
      const data = JSON.parse(dom('kbn-injected-metadata').attr('data'));

      expect(data).toMatchSnapshot(INJECTED_METADATA);
    });
  });
});
