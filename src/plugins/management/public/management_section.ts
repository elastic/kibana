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

import { ReactElement } from 'react';

import { CreateSection, RegisterManagementAppArgs, ManagementSectionId } from './types';
import { KibanaLegacySetup } from '../../kibana_legacy/public';
import { StartServicesAccessor } from '../../../core/public';
// @ts-ignore
import { LegacyManagementSection } from './legacy';
import { ManagementApp } from './management_app';

export class ManagementSection {
  public readonly id: ManagementSectionId;
  public readonly title: string | ReactElement = '';
  public readonly apps: ManagementApp[] = [];
  public readonly order: number;
  public readonly euiIconType?: string;
  public readonly icon?: string;
  private readonly getSections: () => ManagementSection[];
  private readonly registerLegacyApp: KibanaLegacySetup['registerLegacyApp'];
  private readonly getLegacyManagementSection: () => LegacyManagementSection;
  private readonly getStartServices: StartServicesAccessor;

  constructor(
    { id, title, order = 100, euiIconType, icon }: CreateSection,
    getSections: () => ManagementSection[],
    registerLegacyApp: KibanaLegacySetup['registerLegacyApp'],
    getLegacyManagementSection: () => ManagementSection,
    getStartServices: StartServicesAccessor
  ) {
    this.id = id;
    this.title = title;
    this.order = order;
    this.euiIconType = euiIconType;
    this.icon = icon;
    this.getSections = getSections;
    this.registerLegacyApp = registerLegacyApp;
    this.getLegacyManagementSection = getLegacyManagementSection;
    this.getStartServices = getStartServices;
  }

  registerApp({ id, title, order, mount }: RegisterManagementAppArgs) {
    if (this.getApp(id)) {
      throw new Error(`Management app already registered - id: ${id}, title: ${title}`);
    }

    const app = new ManagementApp(
      { id, title, order, mount, basePath: `/management/${this.id}/${id}` },
      this.getSections,
      this.registerLegacyApp,
      this.getLegacyManagementSection,
      this.getStartServices
    );
    this.apps.push(app);
    return app;
  }
  getApp(id: ManagementApp['id']) {
    return this.apps.find((app) => app.id === id);
  }
  getAppsEnabled() {
    return this.apps.filter((app) => app.enabled).sort((a, b) => a.order - b.order);
  }
}
