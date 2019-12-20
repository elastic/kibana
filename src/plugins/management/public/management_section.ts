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

import { CreateSection, RegisterManagementAppArgs } from './types';
import { KibanaLegacySetup } from '../../kibana_legacy/public';
// @ts-ignore
import { LegacyManagementSection } from './legacy';
import { ManagementApp } from './management_app';

export class ManagementSection {
  public readonly id: string = '';
  public readonly title: string = '';
  public readonly apps: ManagementApp[] = [];
  public readonly order?: number;
  public readonly euiIconType?: string;
  public readonly icon?: string;
  private readonly sections: ManagementSection[];
  private readonly registerLegacyApp: KibanaLegacySetup['registerLegacyApp'];
  private readonly getLegacyManagementSection: () => LegacyManagementSection;

  constructor(
    section: CreateSection,
    sections: ManagementSection[],
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

  registerApp({ id, title, order, mount }: RegisterManagementAppArgs) {
    const app = new ManagementApp(
      { id, title, order, mount, basePath: '' },
      this.id,
      this.sections,
      this.registerLegacyApp,
      this.getLegacyManagementSection
    );
    this.apps.push(app);
    return app;
  }
}
