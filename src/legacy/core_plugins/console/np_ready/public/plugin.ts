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

import { PluginInitializerContext, Plugin, CoreStart, CoreSetup } from '../../../../../core/public';
import { XPluginSet } from './legacy';
import { boot } from './application';

export class ConsoleUIPlugin implements Plugin<any, any> {
  // @ts-ignore
  constructor(private readonly ctx: PluginInitializerContext) {}

  async setup({ application, notifications }: CoreSetup, pluginSet: XPluginSet) {
    const {
      __LEGACY: { docLinkVersion, I18nContext, ResizeChecker },
    } = pluginSet;

    application.register({
      id: 'console',
      order: 1,
      title: 'Console',
      mount(ctx, { element }) {
        render(boot({ docLinkVersion, I18nContext, ResizeChecker, notifications }), element);
        return () => {
          unmountComponentAtNode(element);
        };
      },
    });
  }

  async start(core: CoreStart) {}
}
