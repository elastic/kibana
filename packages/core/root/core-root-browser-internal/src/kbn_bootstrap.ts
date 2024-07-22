/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
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

  let i18nError: Error | undefined;
  const apmSystem = new ApmSystem(
    injectedMetadata.apmConfig ?? undefined,
    injectedMetadata.basePath
  );

  await Promise.all([
    // eslint-disable-next-line no-console
    apmSystem.setup().catch(console.warn),
    i18n.load(injectedMetadata.i18n.translationsUrl).catch((error) => {
      i18nError = error;
    }),
  ]);

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
