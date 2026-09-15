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

    const err = document.createElement('div');
    err.style.textAlign = 'center';
    err.style.padding = '240px 20px';
    err.style.fontFamily = 'Inter, BlinkMacSystemFont, Helvetica, Arial, sans-serif';
    err.style.maxInlineSize = '420px';
    err.style.margin = '0 auto';

    const errorTitleEl = document.createElement('h1');
    errorTitleEl.className = 'kbnBootstrapErrorTitle';
    errorTitleEl.innerText = errorTitle;
    errorTitleEl.style.fontSize = '24px';
    errorTitleEl.style.fontWeight = '600';
    errorTitleEl.style.lineHeight = '2rem';
    errorTitleEl.style.letterSpacing = '-0.2px';
    errorTitleEl.style.margin = '0 0 8px';

    const errorTextEl = document.createElement('p');
    errorTextEl.className = 'kbnBootstrapErrorText';
    errorTextEl.innerText = errorText;
    errorTextEl.style.fontSize = '14px';
    errorTextEl.style.fontWeight = '400';
    errorTextEl.style.lineHeight = '1.5';
    errorTextEl.style.margin = '0 auto 24px';

    const errorReloadEl = document.createElement('button');
    errorReloadEl.className = 'kbnBootstrapErrorButton';
    errorReloadEl.innerText = errorReload;
    errorReloadEl.onclick = function () {
      location.reload();
    };
    errorReloadEl.setAttribute(
      'style',
      'cursor: pointer; padding-inline: 12px; block-size: 40px; font-size: 14px; font-weight: 450; line-height: 40px; border-radius: 8px; border:none'
    );

    err.appendChild(errorTitleEl);
    err.appendChild(errorTextEl);
    err.appendChild(errorReloadEl);

    document.body.innerHTML = '';
    document.body.appendChild(err);
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
