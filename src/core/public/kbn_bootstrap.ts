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

/**
 * This is the entry point used to boot the frontend when serving a application
 * that lives in the Kibana Platform.
 *
 * Any changes to this file should be kept in sync with
 * src/legacy/ui/ui_bundles/app_entry_template.js
 */

import { i18n } from '@kbn/i18n';
import { CoreSystem } from './core_system';
import { ApmSystem } from './apm_system';

/** @internal */
export async function __kbnBootstrap__() {
  const injectedMetadata = JSON.parse(
    document.querySelector('kbn-injected-metadata')!.getAttribute('data')!
  );

  const apmSystem = new ApmSystem(injectedMetadata.vars.apmConfig);
  await apmSystem.setup();

  let i18nError: Error | undefined;
  try {
    await i18n.load(injectedMetadata.i18n.translationsUrl);
  } catch (error) {
    i18nError = error;
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
