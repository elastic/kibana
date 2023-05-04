/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCollectionSetup, UsageCollectorOptions } from '@kbn/usage-collection-plugin/server';
import { HttpServiceSetup, CspConfig } from '@kbn/core/server';

interface Usage {
  strict: boolean;
  warnLegacyBrowsers: boolean;
  rulesChangedFromDefault: boolean;
}

export function createCspCollector(http: HttpServiceSetup): UsageCollectorOptions<Usage> {
  return {
    type: 'csp',
    isReady: () => true,
    async fetch() {
      const { strict, warnLegacyBrowsers, header } = http.csp;

      return {
        strict,
        warnLegacyBrowsers,
        // It's important that we do not send the value of csp.header here as it
        // can be customized with values that can be identifiable to given
        // installs, such as URLs
        rulesChangedFromDefault: header !== CspConfig.DEFAULT.header,
      };
    },
    schema: {
      strict: {
        type: 'boolean',
        _meta: { description: 'Indicates if strict mode should be used.' },
      },
      warnLegacyBrowsers: {
        type: 'boolean',
        _meta: { description: 'Indicates if legacy browser versions should be warned.' },
      },
      rulesChangedFromDefault: {
        type: 'boolean',
        _meta: { description: 'Indicates if the rules have been changed from the default.' },
      },
    },
  };
}

export function registerCspCollector(
  usageCollection: UsageCollectionSetup,
  http: HttpServiceSetup
): void {
  const collectorOptions = createCspCollector(http);
  const collector = usageCollection.makeUsageCollector<Usage>(collectorOptions);
  usageCollection.registerCollector(collector);
}
