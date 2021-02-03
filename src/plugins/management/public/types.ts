/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ScopedHistory, Capabilities } from 'kibana/public';
import { ManagementSection, RegisterManagementSectionArgs } from './utils';
import { ChromeBreadcrumb } from '../../../core/public/';

export interface ManagementSetup {
  sections: SectionsServiceSetup;
}

export interface DefinedSections {
  ingest: ManagementSection;
  data: ManagementSection;
  insightsAndAlerting: ManagementSection;
  security: ManagementSection;
  kibana: ManagementSection;
  stack: ManagementSection;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ManagementStart {}

export interface ManagementSectionsStartPrivate {
  getSectionsEnabled: () => ManagementSection[];
}

export interface SectionsServiceStartDeps {
  capabilities: Capabilities;
}

export interface SectionsServiceSetup {
  register: (args: Omit<RegisterManagementSectionArgs, 'capabilities'>) => ManagementSection;
  section: DefinedSections;
}

export interface SectionsServiceStart {
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
  title: string;
  tip?: string;
  order?: number;
  euiIconType?: string; // takes precedence over `icon` property.
  icon?: string; // URL to image file; fallback if no `euiIconType`
}
