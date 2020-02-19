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
import { auto } from 'angular';
import { CoreSetup, Plugin } from 'kibana/public';
import { DocViewInput, DocViewInputFn } from './doc_views/doc_views_types';
import { DocViewsRegistry } from './doc_views/doc_views_registry';
import { DocViewTable } from './components/table/table';
import { JsonCodeBlock } from './components/json_code_block/json_code_block';

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
export interface DiscoverSetup {
  addDocView(docViewRaw: DocViewInput | DocViewInputFn): void;
  setAngularInjector(injector: auto.IInjectorService): void;
}
export type DiscoverStart = void;

/**
 * Contains Discover, one of the oldest parts of Kibana
 * There are 2 kinds of Angular bootstrapped for rendering, additionally to the main Angular
 * Discover provides embeddables, those contain a slimmer Angular
 */
export class DiscoverPlugin implements Plugin<DiscoverSetup, DiscoverStart> {
  private docViewsRegistry: DocViewsRegistry | null = null;

  setup(core: CoreSetup): DiscoverSetup {
    this.docViewsRegistry = new DocViewsRegistry();
    this.docViewsRegistry.addDocView({
      title: i18n.translate('kbn.discover.docViews.table.tableTitle', {
        defaultMessage: 'Table',
      }),
      order: 10,
      component: DocViewTable,
    });
    this.docViewsRegistry.addDocView({
      title: i18n.translate('kbn.discover.docViews.json.jsonTitle', {
        defaultMessage: 'JSON',
      }),
      order: 20,
      component: JsonCodeBlock,
    });

    return {
      addDocView: this.docViewsRegistry.addDocView.bind(this.docViewsRegistry),
      setAngularInjector: this.docViewsRegistry.setAngularInjector.bind(this.docViewsRegistry),
    };
  }

  start() {}
}
