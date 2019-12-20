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
import { CreateManagementApp, ManagementSectionMount, Unmount } from './types';
import { KibanaLegacySetup } from '../../kibana_legacy/public';
// @ts-ignore
import { LegacyManagementSection } from './legacy';
import { Chrome } from './chrome';
import { ManagementSection } from './management_section';

export class ManagementApp {
  readonly id: string;
  readonly title: string;
  readonly basePath: string;
  readonly order?: number;
  readonly mount: ManagementSectionMount;
  readonly sections: ManagementSection[];
  protected enabledStatus: boolean = true;
  private readonly sectionId: ManagementSection['id'];
  private readonly registerLegacyApp: KibanaLegacySetup['registerLegacyApp'];
  private readonly getLegacyManagementSection: () => LegacyManagementSection;

  constructor(
    { id, title, basePath, order, mount }: CreateManagementApp,
    sectionId: ManagementSection['id'],
    sections: ManagementSection[],
    registerLegacyApp: KibanaLegacySetup['registerLegacyApp'],
    getLegacyManagementSection: () => ManagementSection
  ) {
    this.id = id;
    this.title = title;
    this.basePath = basePath;
    this.order = order;
    this.mount = mount;
    this.sectionId = sectionId;
    this.sections = sections;
    this.registerLegacyApp = registerLegacyApp;
    this.getLegacyManagementSection = getLegacyManagementSection;

    const legacyAppId = `management/${this.sectionId}/${this.id}`;

    // todo - appid might be the same as basePath
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
