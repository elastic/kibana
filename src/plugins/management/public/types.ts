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

import { AppMountContext } from 'kibana/public';

export interface ManagementSetup {
  sections: SectionsServiceSetup;
}

export interface ManagementStart {
  sections: SectionsServiceStart;
  legacy: any;
}

interface SectionsServiceSetup {
  get: (sectionId: ISection['id']) => ISection | undefined;
  register: RegisterSection;
}

interface SectionsServiceStart {
  getAvailable: () => Array<Omit<ISection, 'registerApp'>>; // filtered based on capabilities
  // uses `core.application.navigateToApp` under the hood, automatically prepending the `path` for the link
  navigateToApp: (appId: string, options?: { path?: string; state?: any }) => void;
}

export interface CreateSection {
  id: string;
  title: string;
  order?: number;
  euiIconType?: string; // takes precedence over `icon` property.
  icon?: string; // URL to image file; fallback if no `euiIconType`
}

export type RegisterSection = (section: CreateSection) => ISection;

export interface RegisterManagementAppArgs {
  id: string;
  title: string;
  mount: ManagementSectionMount;
  order?: number;
}

export type RegisterManagementApp = (managementApp: RegisterManagementAppArgs) => ManagementApp;

export type Unmount = () => Promise<void> | void;

interface ManagementSectionMountParams {
  sectionBasePath: string; // base path for setting up your router
  element: HTMLElement; // element the section should render into
}

export type ManagementSectionMount = (
  context: AppMountContext,
  params: ManagementSectionMountParams
) => Unmount | Promise<Unmount>;

export interface ManagementApp {
  id: string;
  title: string;
  basePath: string;
  sectionId: string;
  order?: number;
  mount: ManagementSectionMount; // todo added this, is it needed?
}

export interface ISection {
  id: string;
  title: string;
  apps: ManagementApp[];
  registerApp: RegisterManagementApp;
  order?: number;
  euiIconType?: string;
  icon?: string;
}

export interface LegacySection extends LegacyApp {
  visibleItems: LegacyApp[];
}

export interface LegacyApp {
  disabled: boolean;
  visible: boolean;
  id: string;
  display: string;
  url?: string;
  euiIconType?: IconType;
  icon?: string;
}

// export type GetLegacyManagement = () =>
