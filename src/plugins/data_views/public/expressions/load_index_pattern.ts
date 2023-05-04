/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StartServicesAccessor } from '@kbn/core/public';
import {
  getIndexPatternLoadMeta,
  IndexPatternLoadExpressionFunctionDefinition,
  IndexPatternLoadStartDependencies,
} from '../../common/expressions';
import { DataViewsPublicPluginStart, DataViewsPublicStartDependencies } from '../types';

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
  getStartDependencies: () => Promise<IndexPatternLoadStartDependencies>;
}) {
  return (): IndexPatternLoadExpressionFunctionDefinition => ({
    ...getIndexPatternLoadMeta(),
    async fn(input, args) {
      const { indexPatterns } = await getStartDependencies();

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
  getStartServices: StartServicesAccessor<
    DataViewsPublicStartDependencies,
    DataViewsPublicPluginStart
  >;
}) {
  return getFunctionDefinition({
    getStartDependencies: async () => {
      const [, , indexPatterns] = await getStartServices();
      return { indexPatterns };
    },
  });
}
