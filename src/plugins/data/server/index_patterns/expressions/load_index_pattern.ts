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

import { i18n } from '@kbn/i18n';
import { KibanaRequest, StartServicesAccessor } from 'src/core/server';

import {
  getIndexPatternLoadMeta,
  IndexPatternLoadExpressionFunctionDefinition,
  IndexPatternLoadStartDependencies,
} from '../../../common/index_patterns/expressions';
import { DataPluginStartDependencies, DataPluginStart } from '../../plugin';

/**
 * Returns the expression function definition. Any stateful dependencies are accessed
 * at runtime via the `getStartDependencies` param, which provides the specific services
 * needed for this function to run.
 *
 * This function is an implementation detail of this module, and is exported separately
 * only for testing purposes.
 *
 * @param getStartDependencies - async function that resolves with IndexPatternLoadStartDependencies
 *
 * @internal
 */
export function getFunctionDefinition({
  getStartDependencies,
}: {
  getStartDependencies: (req: KibanaRequest) => Promise<IndexPatternLoadStartDependencies>;
}) {
  return (): IndexPatternLoadExpressionFunctionDefinition => ({
    ...getIndexPatternLoadMeta(),
    async fn(input, args, { getKibanaRequest }) {
      const kibanaRequest = getKibanaRequest ? getKibanaRequest() : null;
      if (!kibanaRequest) {
        throw new Error(
          i18n.translate('data.indexPatterns.indexPatternLoad.error.kibanaRequest', {
            defaultMessage:
              'A KibanaRequest is required to execute this search on the server. ' +
              'Please provide a request object to the expression execution params.',
          })
        );
      }

      const { indexPatterns } = await getStartDependencies(kibanaRequest);

      const indexPattern = await indexPatterns.get(args.id);

      return { type: 'index_pattern', value: indexPattern.toSpec() };
    },
  });
}

/**
 * This is some glue code that takes in `core.getStartServices`, extracts the dependencies
 * needed for this function, and wraps them behind a `getStartDependencies` function that
 * is then called at runtime.
 *
 * We do this so that we can be explicit about exactly which dependencies the function
 * requires, without cluttering up the top-level `plugin.ts` with this logic. It also
 * makes testing the expression function a bit easier since `getStartDependencies` is
 * the only thing you should need to mock.
 *
 * @param getStartServices - core's StartServicesAccessor for this plugin
 *
 * @internal
 */
export function getIndexPatternLoad({
  getStartServices,
}: {
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>;
}) {
  return getFunctionDefinition({
    getStartDependencies: async (request: KibanaRequest) => {
      const [{ elasticsearch, savedObjects }, , { indexPatterns }] = await getStartServices();
      return {
        indexPatterns: await indexPatterns.indexPatternsServiceFactory(
          savedObjects.getScopedClient(request),
          elasticsearch.client.asScoped(request).asCurrentUser
        ),
      };
    },
  });
}
