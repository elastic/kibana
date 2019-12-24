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

import * as React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { CreateManagementApp, ManagementSectionMount, Unmount } from './types';
import { KibanaLegacySetup } from '../../kibana_legacy/public';
// @ts-ignore
import { LegacyManagementSection } from './legacy';
import { ManagementChrome } from './management_chrome';
import { ManagementSection } from './management_section';
import { ChromeBreadcrumb } from '../../../core/public/';

export class ManagementApp {
  readonly id: string;
  readonly title: string;
  readonly basePath: string;
  readonly order?: number;
  readonly mount: ManagementSectionMount;
  readonly sections: ManagementSection[];
  protected enabledStatus: boolean = true;
  private readonly registerLegacyApp: KibanaLegacySetup['registerLegacyApp'];
  private readonly getLegacyManagementSections: () => LegacyManagementSection;

  constructor(
    { id, title, basePath, order, mount }: CreateManagementApp,
    sections: ManagementSection[],
    registerLegacyApp: KibanaLegacySetup['registerLegacyApp'],
    getLegacyManagementSections: () => ManagementSection
  ) {
    this.id = id;
    this.title = title;
    this.basePath = basePath;
    this.order = order;
    this.mount = mount;
    this.sections = sections;
    this.registerLegacyApp = registerLegacyApp;
    this.getLegacyManagementSections = getLegacyManagementSections;

    this.registerLegacyApp({
      id: basePath.substr(1), // get rid of initial slash
      title,
      mount: async (appMountContext, params) => {
        let appUnmount: Unmount;
        function setBreadcrumbs(crumbs: ChromeBreadcrumb[]) {
          appMountContext.core.chrome.setBreadcrumbs([
            {
              text: i18n.translate('management.breadcrumb', {
                defaultMessage: 'Management',
              }),
              href: '#/management',
            },
            ...crumbs,
          ]);
        }

        ReactDOM.render(
          <ManagementChrome
            sections={this.sections}
            selectedId={id}
            legacySections={this.getLegacyManagementSections().items}
            mountedCallback={async element => {
              appUnmount = await mount(appMountContext, {
                basePath,
                element,
                setBreadcrumbs,
              });
            }}
          />,
          params.element
        );

        return async () => {
          appUnmount();
          ReactDOM.unmountComponentAtNode(params.element);
        };
      },
    });
  }
  public enable() {
    this.enabledStatus = true;
  }
  public disable() {
    this.enabledStatus = false;
  }
  public get enabled() {
    return this.enabledStatus;
  }
}
