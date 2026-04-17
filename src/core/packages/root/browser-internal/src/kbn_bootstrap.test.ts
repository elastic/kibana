/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apmSystem, fatalErrorMock, i18nLoad } from './kbn_bootstrap.test.mocks';
import { __kbnBootstrap__ } from '.';

const setMetadata = (i18nOverrides: Record<string, unknown> = {}) => {
  const metadata = {
    i18n: {
      translationsUrl: '/translations/abc123/en.json',
      translationHashes: { en: 'abc123', 'fr-FR': 'def456', 'ja-JP': 'ghi789' },
      ...i18nOverrides,
    },
    vars: { apmConfig: null },
  };
  // eslint-disable-next-line no-unsanitized/property
  document.body.innerHTML = `<kbn-injected-metadata data=${JSON.stringify(metadata)}>
</kbn-injected-metadata>`;
};

describe('kbn_bootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.performance.mark = jest.fn();
    setMetadata();
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

  describe('locale resolution priority', () => {
    it('uses the default translationsUrl when no overrides are present', async () => {
      setMetadata();

      await __kbnBootstrap__();

      expect(i18nLoad).toHaveBeenCalledWith('/translations/abc123/en.json');
    });

    it('userLocale overrides the default translationsUrl', async () => {
      setMetadata({ userLocale: 'ja-JP' });

      await __kbnBootstrap__();

      expect(i18nLoad).toHaveBeenCalledWith('/translations/ghi789/ja-JP.json');
    });

    it('userLocale overrides even when translationsUrl targets a non-default locale', async () => {
      setMetadata({
        translationsUrl: '/translations/def456/fr-FR.json',
        userLocale: 'ja-JP',
      });

      await __kbnBootstrap__();

      expect(i18nLoad).toHaveBeenCalledWith('/translations/ghi789/ja-JP.json');
    });

    it('does not override when resolvedLocale has no matching translationHash', async () => {
      setMetadata({ userLocale: 'unknown-LOCALE' });

      await __kbnBootstrap__();

      // No hash for 'unknown-LOCALE', so translationsUrl stays unchanged
      expect(i18nLoad).toHaveBeenCalledWith('/translations/abc123/en.json');
    });
  });
});
