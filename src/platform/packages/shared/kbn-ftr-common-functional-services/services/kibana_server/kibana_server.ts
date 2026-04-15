/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';
import { KbnClient } from '@kbn/test';

import type { FtrProviderContext } from '../ftr_provider_context';

export function KibanaServerProvider({ getService }: FtrProviderContext): KbnClient {
  const log = getService('log');
  const config = getService('config');
  const lifecycle = getService('lifecycle');
  const url = Url.format(config.get('servers.kibana'));
  const defaults = config.get('uiSettings.defaults');
  const globalDefaults = config.get('uiSettings.globalDefaults');

  const kbn = new KbnClient({
    log,
    url,
    certificateAuthorities: config.get('servers.kibana.certificateAuthorities'),
    uiSettingDefaults: defaults,
  });

  if (defaults) {
    lifecycle.beforeTests.add(async () => {
      await kbn.uiSettings.update(defaults);
    });
  }

  if (globalDefaults) {
    lifecycle.beforeTests.add(async () => {
      try {
        await kbn.uiSettings.updateGlobal(globalDefaults);
      } catch (err) {
        // If a setting is already enforced via server-level globalOverrides, the API returns 400.
        // That's fine — the override achieves the same goal.
        if (err?.message?.includes('because it is overridden')) {
          log.warning(
            `Skipping globalDefaults update — setting already enforced by a server-level override: ${err.message}`
          );
          return;
        }
        throw err;
      }
    });
  }

  return kbn;
}
