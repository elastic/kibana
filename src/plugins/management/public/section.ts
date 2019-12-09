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

import { ManagementApp, ManagementSectionMount, CreateSection, ISection } from './types';

export class Section implements ISection {
  public readonly id: string = '';
  public readonly title: string = '';
  public readonly apps: ManagementApp[] = [];
  // registerApp: RegisterManagementApp;
  public readonly order?: number;
  public readonly euiIconType?: string;
  public readonly icon?: string;

  constructor(section: CreateSection) {
    this.id = section.id;
    this.title = section.title;
    this.order = section.order;
    this.euiIconType = section.euiIconType;
    this.icon = section.icon;
  }

  /*
  registerApp({
    id,
    title,
    order,
    mount,
  }: {
    id: string;
    title: string;
    order?: number;
    mount: ManagementSectionMount;
  }): Section {
    this.apps.push( new ManagementApp())
  }
  */
  registerApp({
    id,
    title,
    order,
    mount,
    url,
  }: {
    id: string;
    title: string;
    order?: number;
    mount: ManagementSectionMount;
    url?: string; // only for transitioning legacy management migration
  }) {
    // this.apps.push(new ManagementApp(app));
    const app = { id, title, sectionId: this.id, order, basePath: 'basePath', mount, url };
    this.apps.push(app);
    return app;
  }
}
