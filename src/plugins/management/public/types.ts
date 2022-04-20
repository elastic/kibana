/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { ScopedHistory, Capabilities } from '@kbn/core/public';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import { ChromeBreadcrumb, CoreTheme } from '@kbn/core/public';
import { ManagementSection, RegisterManagementSectionArgs } from './utils';
import type { ManagementAppLocatorParams } from '../common/locator';

export interface ManagementSetup {
  sections: SectionsServiceSetup;
  locator: LocatorPublic<ManagementAppLocatorParams>;
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
  theme$: Observable<CoreTheme>;
}

export interface CreateManagementItemArgs {
  id: string;
  title: string;
  tip?: string;
  order?: number;
  euiIconType?: string; // takes precedence over `icon` property.
  icon?: string; // URL to image file; fallback if no `euiIconType`
  capabilitiesId?: string; // overrides app id
  redirectFrom?: string; // redirects from an old app id to the current app id
}
