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

import { apmImport, apmInit } from '../apm';

export const appEntryTemplate = (bundle) => `
/**
 * Kibana entry file
 *
 * This is programmatically created and updated, do not modify
 *
 * Any changes to this file should be kept in sync with
 * src/core/public/entry_point.ts
 *
 * context: ${bundle.getContext()}
 */

${apmImport()}
import { i18n } from '@kbn/i18n';
import { CoreSystem } from '__kibanaCore__'

const injectedMetadata = JSON.parse(document.querySelector('kbn-injected-metadata').getAttribute('data'));

${apmInit('injectedMetadata.vars.apmConfig')}

i18n.load(injectedMetadata.i18n.translationsUrl)
  .catch(e => e)
  .then((i18nError) => {
    const coreSystem = new CoreSystem({
      injectedMetadata,
      rootDomElement: document.body,
      browserSupportsCsp: !window.__kbnCspNotEnforced__,
      requireLegacyFiles: () => {
        ${bundle.getRequires().join('\n  ')}
      },
      requireLegacyBootstrapModule: () => require('ui/chrome'),
      requireNewPlatformShimModule: () => require('ui/new_platform'),
    });

    coreSystem
      .setup()
      .then((coreSetup) => {
        if (i18nError) {
          coreSetup.fatalErrors.add(i18nError);
        }

        return coreSystem.start();
      });
  });
`;
