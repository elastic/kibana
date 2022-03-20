/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './index.scss';
import { PluginInitializerContext } from '../../../core/public';
import { ConfigSchema } from '../config';
import { UnifiedSearchPublicPlugin } from './plugin';

/*
 * UI components
 */

export type { IndexPatternSelectProps } from './index_pattern_select';
export type { QueryStringInputProps } from './query_string_input';
export type { SearchBarProps, StatefulSearchBarProps } from './search_bar';

export { QueryStringInput } from './query_string_input';
export { SearchBar } from './search_bar';

export { createIndexPatternSelect } from './index_pattern_select';

export type {
  UnifiedSearchPublicPluginStart,
  UnifiedSearchPluginSetup,
  UnifiedSearchPluginStart,
} from './types';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  return new UnifiedSearchPublicPlugin(initializerContext);
}
