/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apmSystem, fatalErrorMock, i18nLoad } from './kbn_bootstrap.test.mocks';
import { __kbnBootstrap__ } from '.';

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
