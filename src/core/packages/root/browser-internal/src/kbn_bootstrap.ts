/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n, setAvailableLocales } from '@kbn/i18n';
import type { InjectedMetadata } from '@kbn/core-injected-metadata-common-internal';
import { KBN_LOAD_MARKS } from './events';
import { CoreSystem } from './core_system';
import { ApmSystem } from './apm_system';

import { LOAD_BOOTSTRAP_START } from './events';

interface BootstrapErrorContent {
  errorTitle: string;
  errorText: string;
  errorReload: string;
}

const renderBootstrapErrorPage = ({
  errorTitle,
  errorText,
  errorReload,
}: BootstrapErrorContent) => {
  const err = document.createElement('div');
  err.className = 'kbnBootstrapError';

  const errorTitleEl = document.createElement('h1');
  errorTitleEl.className = 'kbnBootstrapErrorTitle';
  errorTitleEl.innerText = errorTitle;

  const errorTextEl = document.createElement('p');
  errorTextEl.className = 'kbnBootstrapErrorText';
  errorTextEl.innerText = errorText;

  const errorReloadEl = document.createElement('button');
  errorReloadEl.className = 'kbnBootstrapErrorButton';
  errorReloadEl.innerText = errorReload;
  errorReloadEl.onclick = () => {
    location.reload();
  };

  err.appendChild(errorTitleEl);
  err.appendChild(errorTextEl);
  err.appendChild(errorReloadEl);

  document.body.innerHTML = '';
  document.body.appendChild(err);
};

/** @internal */
export async function __kbnBootstrap__() {
  performance.mark(KBN_LOAD_MARKS, {
    detail: LOAD_BOOTSTRAP_START,
  });

  const injectedMetadata: InjectedMetadata = JSON.parse(
    document.querySelector('kbn-injected-metadata')!.getAttribute('data')!
  );

  setAvailableLocales(injectedMetadata.i18n.availableLocales ?? []);

  let i18nError: Error | undefined;
  const apmSystem = new ApmSystem(
    injectedMetadata.apmConfig ?? undefined,
    injectedMetadata.basePath
  );

  await Promise.all([
    // eslint-disable-next-line no-console
    apmSystem.setup().catch(console.warn),
    i18n.getIsInitialized()
      ? Promise.resolve()
      : injectedMetadata.i18n.translationsUrl === null
      ? Promise.resolve(i18n.initDefault())
      : i18n.load(injectedMetadata.i18n.translationsUrl).catch((error) => {
          i18nError = error;
        }),
  ]);

  const isDomStorageDisabled = () => {
    try {
      const key = 'kbn_bootstrap_domStorageEnabled';
      sessionStorage.setItem(key, 'true');
      sessionStorage.removeItem(key);
      localStorage.setItem(key, 'true');
      localStorage.removeItem(key);
      return false;
    } catch (e) {
      return true;
    }
  };

  if (isDomStorageDisabled()) {
    const defaultErrorTitle = `Couldn't load the page`;
    const defaultErrorText = `Update your browser's settings to allow storage of cookies and site data, and reload the page.`;
    const defaultErrorReload = 'Reload';

    const errorTitle = i18nError
      ? defaultErrorTitle
      : i18n.translate('core.ui.welcomeErrorCouldNotLoadPage', {
          defaultMessage: defaultErrorTitle,
        });

    const errorText = i18nError
      ? defaultErrorText
      : i18n.translate('core.ui.welcomeErrorDomStorageDisabled', {
          defaultMessage: defaultErrorText,
        });

    const errorReload = i18nError
      ? defaultErrorReload
      : i18n.translate('core.ui.welcomeErrorReloadButton', {
          defaultMessage: defaultErrorReload,
        });

    renderBootstrapErrorPage({ errorTitle, errorText, errorReload });
    return;
  }

  const coreSystem = new CoreSystem({
    injectedMetadata,
    rootDomElement: document.body,
    browserSupportsCsp: !(window as any).__kbnCspNotEnforced__,
  });

  const setup = await coreSystem.setup();
  if (i18nError && setup) {
    setup.fatalErrors.add(i18nError);
  }

  const start = await coreSystem.start();
  await apmSystem.start(start);
}
