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

import { ManagementApp, CreateSection, ISection, RegisterManagementAppArgs } from './types';
import { KibanaLegacySetup } from '../../kibana_legacy/public';

export class Section implements ISection {
  public readonly id: string = '';
  public readonly title: string = '';
  public readonly apps: ManagementApp[] = [];
  public readonly order?: number;
  public readonly euiIconType?: string;
  public readonly icon?: string;
  private readonly registerLegacyApp: KibanaLegacySetup['registerLegacyApp'];

  constructor(section: CreateSection, registerLegacyApp: KibanaLegacySetup['registerLegacyApp']) {
    this.id = section.id;
    this.title = section.title;
    this.order = section.order;
    this.euiIconType = section.euiIconType;
    this.icon = section.icon;
    this.registerLegacyApp = registerLegacyApp;
  }

  // todo create class
  registerApp({ id, title, order, mount }: RegisterManagementAppArgs): ManagementApp {
    // this.apps.push(new ManagementApp(app));
    this.registerLegacyApp({
      id: `management/${this.id}/${id}`,
      title,
      mount: async (appMountContext, params) => {
        console.log('abstract mount', appMountContext, params);
        return await mount(appMountContext, { sectionBasePath: '', ...params });
      },
    });

    const app = { id, title, sectionId: this.id, order, basePath: 'basePath', mount };
    this.apps.push(app);
    return app;
  }
}
