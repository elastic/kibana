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
import {
  ManagementApp,
  CreateSection,
  ManagementSection,
  RegisterManagementAppArgs,
} from './types';
import { KibanaLegacySetup } from '../../kibana_legacy/public';
import { Chrome } from './chrome';
import { Unmount } from './types';
// @ts-ignore
import { LegacyManagementSection } from './legacy';

export class Section implements ManagementSection {
  public readonly id: string = '';
  public readonly title: string = '';
  public readonly apps: ManagementApp[] = []; // todo unused
  public readonly order?: number;
  public readonly euiIconType?: string;
  public readonly icon?: string;
  private readonly sections: Section[];
  private readonly registerLegacyApp: KibanaLegacySetup['registerLegacyApp'];
  private readonly getLegacyManagementSection: () => LegacyManagementSection;

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
    const legacyAppId = `management/${this.id}/${id}`;
    this.registerLegacyApp({
      id: legacyAppId,
      title,
      mount: async (appMountContext, params) => {
        let appUnmount: Unmount;

        ReactDOM.render(
          <Chrome
            sections={this.sections}
            selectedId={id}
            legacySections={this.getLegacyManagementSection().items}
            mountedCallback={async element => {
              appUnmount = await mount(appMountContext, { sectionBasePath: legacyAppId, element });
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

    const app = { id, title, sectionId: this.id, order, basePath: legacyAppId, mount };
    this.apps.push(app);
    return app;
  }
}
