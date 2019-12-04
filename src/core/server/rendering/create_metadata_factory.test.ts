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

import { createMetadataFactory } from './create_metadata_factory';
import { mockRenderingProviderParams } from './__mocks__/params';
import { METADATA } from '../test_utils';

describe('createMetadataFactory', () => {
  let getMetadata: ReturnType<typeof createMetadataFactory>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRenderingProviderParams.uiSettings.getUserProvided.mockResolvedValue({
      providedBy: {
        isOverridden: true,
        value: 'user',
      },
    });
    getMetadata = createMetadataFactory(mockRenderingProviderParams);
  });

  describe('getMetadata', () => {
    it('produces default metadata', async () => {
      const metadata = await getMetadata();

      expect(metadata).toMatchSnapshot(METADATA);
    });

    it('produces metadata with custom overrides', async () => {
      getMetadata = createMetadataFactory({
        ...mockRenderingProviderParams,
        injectedVarsOverrides: { fake: '__TEST_TOKEN__' },
      });
      const metadata = await getMetadata();

      expect(metadata).toMatchSnapshot(METADATA);
    });

    it('produces metadata with excluded user config', async () => {
      const metadata = await getMetadata(undefined, false);

      expect(metadata).toMatchSnapshot(METADATA);
    });

    it('produces metadata with custom overrides and excluded user config', async () => {
      getMetadata = createMetadataFactory({
        ...mockRenderingProviderParams,
        injectedVarsOverrides: { fake: '__TEST_TOKEN__' },
      });
      const metadata = await getMetadata(undefined, false);

      expect(metadata).toMatchSnapshot(METADATA);
    });
  });
});
