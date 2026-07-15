/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { getEsqlColumns, getEsqlPolicies, getESQLSources } from '@kbn/esql-utils';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ILicense } from '@kbn/licensing-types';
import { useObservable } from '@kbn/use-observable';

export interface UseWorkflowEsqlCallbacksOptions {
  http: CoreStart['http'];
  application: CoreStart['application'];
  data: DataPublicPluginStart;
  licensing: LicensingPluginStart;
}

/**
 * Builds the minimal `ESQLCallbacks` shape needed for ES|QL autocomplete
 * inside a workflow YAML editor:
 *
 *   - `getSources` powers `FROM` completions.
 *   - `getColumnsFor` powers field completions in WHERE / KEEP / STATS …
 *   - `getPolicies` powers ENRICH completions.
 *   - `getPreferences` is supplied so the language tooling has a stable
 *     histogram bucket target without round-tripping to advanced settings.
 *   - `getLicense` is supplied so license-gated commands gracefully filter.
 *
 * Other callbacks (variables, join indices, inference endpoints, fields
 * metadata) are intentionally omitted — they belong to richer Discover/Lens
 * features and would surface data the workflow author didn't ask for.
 */
export function useWorkflowEsqlCallbacks({
  http,
  application,
  data,
  licensing,
}: UseWorkflowEsqlCallbacksOptions): ESQLCallbacks {
  const license = useObservable(licensing.license$);
  const licenseRef = useRef(license);
  licenseRef.current = license;

  return useMemo(() => {
    const getLicense = async (): Promise<ILicense | undefined> => licenseRef.current;

    return {
      getSources: () => getESQLSources({ http, application }, getLicense),
      getColumnsFor: async (ctx) => {
        const query = ctx?.query;
        if (!query) {
          return [];
        }
        return getEsqlColumns({
          esqlQuery: query,
          search: data.search.search.bind(data.search),
          timeRange: data.query.timefilter.timefilter.getTime(),
        });
      },
      getPolicies: () => getEsqlPolicies(http),
      getPreferences: async () => ({ histogramBarTarget: 50 }),
      getLicense,
    } satisfies ESQLCallbacks;
  }, [http, application, data]);
}
