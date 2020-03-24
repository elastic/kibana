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

import React from 'react';
import { i18n } from '@kbn/i18n';
import { auto } from 'angular';
import { CoreSetup, Plugin } from 'kibana/public';
import { DocViewInput, DocViewInputFn, DocViewRenderProps } from './doc_views/doc_views_types';
import { DocViewsRegistry } from './doc_views/doc_views_registry';
import { DocViewTable } from './components/table/table';
import { JsonCodeBlock } from './components/json_code_block/json_code_block';
import { DocViewer } from './components/doc_viewer/doc_viewer';
import { setDocViewsRegistry } from './services';

import './index.scss';

/**
 * @public
 */
export interface DiscoverSetup {
  docViews: {
    /**
     * Add new doc view shown along with table view and json view in the details of each document in Discover.
     * Both react and angular doc views are supported.
     * @param docViewRaw
     */
    addDocView(docViewRaw: DocViewInput | DocViewInputFn): void;
    /**
     * Set the angular injector for bootstrapping angular doc views. This is only exposed temporarily to aid
     * migration to the new platform and will be removed soon.
     * @deprecated
     * @param injectorGetter
     */
    setAngularInjectorGetter(injectorGetter: () => Promise<auto.IInjectorService>): void;
  };
}
/**
 * @public
 */
export interface DiscoverStart {
  docViews: {
    /**
     * Component rendering all the doc views for a given document.
     * This is only exposed temporarily to aid migration to the new platform and will be removed soon.
     * @deprecated
     */
    DocViewer: React.ComponentType<DocViewRenderProps>;
  };
}

/**
 * Contains Discover, one of the oldest parts of Kibana
 * There are 2 kinds of Angular bootstrapped for rendering, additionally to the main Angular
 * Discover provides embeddables, those contain a slimmer Angular
 */
export class DiscoverPlugin implements Plugin<DiscoverSetup, DiscoverStart> {
  private docViewsRegistry: DocViewsRegistry | null = null;

  setup(core: CoreSetup): DiscoverSetup {
    this.docViewsRegistry = new DocViewsRegistry();
    setDocViewsRegistry(this.docViewsRegistry);
    this.docViewsRegistry.addDocView({
      title: i18n.translate('discover.docViews.table.tableTitle', {
        defaultMessage: 'Table',
      }),
      order: 10,
      component: DocViewTable,
    });
    this.docViewsRegistry.addDocView({
      title: i18n.translate('discover.docViews.json.jsonTitle', {
        defaultMessage: 'JSON',
      }),
      order: 20,
      component: JsonCodeBlock,
    });

    return {
      docViews: {
        addDocView: this.docViewsRegistry.addDocView.bind(this.docViewsRegistry),
        setAngularInjectorGetter: this.docViewsRegistry.setAngularInjectorGetter.bind(
          this.docViewsRegistry
        ),
      },
    };
  }

  start() {
    return {
      docViews: {
        DocViewer,
      },
    };
  }
}
