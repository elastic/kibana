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
import { ScopedHistory } from 'kibana/public';
import { ManagementSection, RegisterManagementSectionArgs } from './utils';
import { ChromeBreadcrumb } from '../../../core/public/';

export interface ManagementSetup {
  sections: SectionsServiceSetup;
}

export interface ManagementStart {
  sections: SectionsServiceStart;
}

export interface SectionsServiceSetup {
  register: (args: RegisterManagementSectionArgs) => ManagementSection;
  getSection: (sectionId: ManagementSectionId | string) => ManagementSection;
}

export interface SectionsServiceStart {
  getSection: (sectionId: ManagementSectionId | string) => ManagementSection;
  getAllSections: () => ManagementSection[];
  getSectionsEnabled: () => ManagementSection[];
}

export enum ManagementSectionId {
  Ingest = 'ingest',
  Data = 'data',
  InsightsAndAlerting = 'insightsAndAlerting',
  Security = 'security',
  Kibana = 'kibana',
  Stack = 'stack',
}

export type Unmount = () => Promise<void> | void;
export type Mount = (params: ManagementAppMountParams) => Unmount | Promise<Unmount>;

export interface ManagementAppMountParams {
  basePath: string; // base path for setting up your router
  element: HTMLElement; // element the section should render into
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  history: ScopedHistory;
}

export interface CreateManagementItemArgs {
  id: string;
  title: string | ReactElement;
  order?: number;
  euiIconType?: string; // takes precedence over `icon` property.
  icon?: string; // URL to image file; fallback if no `euiIconType`
}
