/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart, DataPublicPluginSetup } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { createQueryStringInput } from './components/query_string_input/get_query_string_input';
import type { QueryStringInputProps } from './components/query_string_input/query_string_input';
import {
  AutocompleteService,
  type AutocompleteStart,
  type AutocompleteSetup,
} from './autocomplete/autocomplete_service';
import { setCoreStart } from './services';

export interface KqlPluginSetupDependencies {
  data: DataPublicPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface KqlPluginStartDependencies {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

export interface KqlPluginSetup {
  autocomplete: AutocompleteSetup;
}

export interface KqlPluginStart {
  /**
   * autocomplete service
   * {@link AutocompleteStart}
   */
  autocomplete: AutocompleteStart;
  QueryStringInput: React.ComponentType<Omit<QueryStringInputProps, 'deps'>>;
}

export class KqlPlugin implements Plugin<{}, KqlPluginStart> {
  private readonly autocomplete: AutocompleteService;
  private readonly storage: IStorageWrapper;

  constructor(initContext: PluginInitializerContext) {
    this.autocomplete = new AutocompleteService(initContext);
    this.storage = new Storage(window.localStorage);
  }

  public setup(
    core: CoreSetup<KqlPluginSetupDependencies, KqlPluginStart>,
    { data, usageCollection }: KqlPluginSetupDependencies
  ): KqlPluginSetup {
    const { query } = data;
    return {
      autocomplete: this.autocomplete.setup(core, {
        timefilter: query.timefilter,
        usageCollection,
      }),
    };
  }

  public start(core: CoreStart, { data, dataViews }: KqlPluginStartDependencies): KqlPluginStart {
    const autocompleteStart = this.autocomplete.start();
    setCoreStart(core);

    return {
      autocomplete: autocompleteStart,
      QueryStringInput: createQueryStringInput({
        data,
        dataViews,
        docLinks: core.docLinks,
        http: core.http,
        notifications: core.notifications,
        storage: this.storage,
        uiSettings: core.uiSettings,
        autocomplete: autocompleteStart,
      }),
    };
  }

  public stop() {
    this.autocomplete.clearProviders();
  }
}
