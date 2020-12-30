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
import { apmSystem, fatalErrorMock, i18nLoad } from './kbn_bootstrap.test.mocks';
import { __kbnBootstrap__ } from './';

describe('kbn_bootstrap', () => {
  beforeAll(() => {
    const metadata = {
      i18n: { translationsUrl: 'http://localhost' },
      vars: { apmConfig: null },
    };
    // eslint-disable-next-line no-unsanitized/property
    document.body.innerHTML = `<kbn-injected-metadata data=${JSON.stringify(metadata)}>
</kbn-injected-metadata>`;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not report a fatal error if apm load fails', async () => {
    apmSystem.setup.mockRejectedValueOnce(new Error('reason'));
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementationOnce(() => undefined);

    await __kbnBootstrap__();

    expect(fatalErrorMock.add).toHaveBeenCalledTimes(0);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it('reports a fatal error if i18n load fails', async () => {
    i18nLoad.mockRejectedValueOnce(new Error('reason'));

    await __kbnBootstrap__();

    expect(fatalErrorMock.add).toHaveBeenCalledTimes(1);
  });
});
