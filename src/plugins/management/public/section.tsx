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
import { I18nProvider } from '@kbn/i18n/react';
import { EuiPage, EuiPageBody } from '@elastic/eui';
import { SidebarNav } from './components';
import { ManagementApp, CreateSection, ISection, RegisterManagementAppArgs } from './types';
import { KibanaLegacySetup } from '../../kibana_legacy/public';
// @ts-ignore
import { ManagementSection } from './legacy/section';

export class Section implements ISection {
  public readonly id: string = '';
  public readonly title: string = '';
  public readonly apps: ManagementApp[] = [];
  public readonly order?: number;
  public readonly euiIconType?: string;
  public readonly icon?: string;
  private readonly sections: Section[];
  private readonly registerLegacyApp: KibanaLegacySetup['registerLegacyApp'];
  private readonly getLegacyManagementSection: () => ManagementSection;

  constructor(
    section: CreateSection,
    sections: Section[],
    registerLegacyApp: KibanaLegacySetup['registerLegacyApp'],
    getLegacyManagementSection: () => ManagementSection
  ) {
    this.id = section.id;
    this.title = section.title;
    this.order = section.order;
    this.euiIconType = section.euiIconType;
    this.icon = section.icon;
    this.sections = sections;
    this.registerLegacyApp = registerLegacyApp;
    this.getLegacyManagementSection = getLegacyManagementSection;
  }

  // todo create class
  registerApp({ id, title, order, mount }: RegisterManagementAppArgs): ManagementApp {
    // this.apps.push(new ManagementApp(app));
    this.registerLegacyApp({
      id: `management/${this.id}/${id}`,
      title,
      mount: async (appMountContext, params) => {
        // return await mount(appMountContext, { sectionBasePath: '', ...params });

        // TODO - move SidebarNav, get access to management

        ReactDOM.render(
          <I18nProvider>
            <EuiPage>
              <SidebarNav
                sections={this.sections}
                legacySections={this.getLegacyManagementSection().items}
                selectedId={id}
              />
              <EuiPageBody>hihihi</EuiPageBody>
            </EuiPage>
          </I18nProvider>,
          params.element
        );
        /*
        ReactDOM.render(
          <I18nProvider>
            <EuiPage>
              <SidebarNav
                sections={this.sections}
                // legacySections={management.getVisible()}
                legacySections={[]}
                selectedId={id}
                className="mgtSideNav"
              />
              <EuiPageBody>hihihi</EuiPageBody>
            </EuiPage>
          </I18nProvider>,
          params.element
        );
        */

        return () => {
          ReactDOM.unmountComponentAtNode(params.element);
        };
      },
    });

    const app = { id, title, sectionId: this.id, order, basePath: 'basePath', mount };
    this.apps.push(app);
    return app;
  }
}
