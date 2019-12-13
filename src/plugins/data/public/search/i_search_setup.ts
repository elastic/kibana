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

import { IContextProvider } from 'kibana/public';
import { ISearchContext } from './i_search_context';
import { TRegisterSearchStrategyProvider, TSearchStrategyProvider } from './i_search_strategy';
import { SearchCollectorFactoryInner } from './search_with_collector';

/**
 * The setup contract exposed by the Search plugin exposes the search strategy extension
 * point.
 */
export interface ISearchSetup {
  registerSearchStrategyContext: <TContextName extends keyof ISearchContext>(
    pluginId: symbol,
    contextName: TContextName,
    provider: IContextProvider<TSearchStrategyProvider<any>, TContextName>
  ) => void;

  /**
   * Extension point exposed for other plugins to register their own search
   * strategies.
   */
  registerSearchStrategyProvider: TRegisterSearchStrategyProvider;

  setSearchCollectorFactory: (factory: SearchCollectorFactoryInner) => void;
}
