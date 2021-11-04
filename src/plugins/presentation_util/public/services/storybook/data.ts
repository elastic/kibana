/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataPublicPluginStart } from '../../../../data/public';
import { DataViewField } from '../../../../data_views/common';
import { PresentationDataService } from '../data';
import { PluginServiceFactory } from '../create';

let valueSuggestionMethod = ({ field, query }: { field: DataViewField; query: string }) =>
  Promise.resolve(['storybook', 'default', 'values']);
export const replaceValueSuggestionMethod = (
  newMethod: ({ field, query }: { field: DataViewField; query: string }) => Promise<string[]>
) => (valueSuggestionMethod = newMethod);

export type DataServiceFactory = PluginServiceFactory<PresentationDataService>;
export const dataServiceFactory: DataServiceFactory = () => ({
  autocomplete: {
    getValueSuggestions: valueSuggestionMethod,
  } as unknown as DataPublicPluginStart['autocomplete'],
});
