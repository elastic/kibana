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

import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';

import { PluginInitializerContext, Plugin, CoreStart, CoreSetup } from 'src/core/public';
import { XPluginSet } from '../legacy';

export class ConsoleUIPlugin implements Plugin<any, any> {
  // @ts-ignore
  constructor(private readonly ctx: PluginInitializerContext) {}

  async setup({ notifications }: CoreSetup, pluginSet: XPluginSet) {
    const {
      __LEGACY: { I18nContext, elasticsearchUrl, category },
      dev_tools,
      home,
    } = pluginSet;

    home.featureCatalogue.register({
      id: 'console',
      title: i18n.translate('console.devToolsTitle', {
        defaultMessage: 'Console',
      }),
      description: i18n.translate('console.devToolsDescription', {
        defaultMessage: 'Skip cURL and use this JSON interface to work with your data directly.',
      }),
      icon: 'consoleApp',
      path: '/app/kibana#/dev_tools/console',
      showOnHomePage: true,
      category,
    });

    dev_tools.register({
      id: 'console',
      order: 1,
      title: i18n.translate('console.consoleDisplayName', {
        defaultMessage: 'Console',
      }),
      enableRouting: false,
      async mount(ctx, { element }) {
        const { boot } = await import('./application');
        render(
          boot({
            docLinkVersion: ctx.core.docLinks.DOC_LINK_VERSION,
            I18nContext,
            notifications,
            elasticsearchUrl,
          }),
          element
        );
        return () => {
          unmountComponentAtNode(element);
        };
      },
    });
  }

  async start(core: CoreStart) {}
}
