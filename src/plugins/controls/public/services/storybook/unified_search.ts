/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { ControlsUnifiedSearchService } from '../unified_search';

let valueSuggestionMethod = ({ field, query }: { field: DataViewField; query: string }) =>
  Promise.resolve(['storybook', 'default', 'values']);
export const replaceValueSuggestionMethod = (
  newMethod: ({ field, query }: { field: DataViewField; query: string }) => Promise<string[]>
) => (valueSuggestionMethod = newMethod);

export type UnifiedSearchServiceFactory = PluginServiceFactory<ControlsUnifiedSearchService>;
export const unifiedSearchServiceFactory: UnifiedSearchServiceFactory = () => ({
  autocomplete: {
    getValueSuggestions: valueSuggestionMethod,
  } as unknown as UnifiedSearchPublicPluginStart['autocomplete'],
});
