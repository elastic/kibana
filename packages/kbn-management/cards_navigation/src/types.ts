/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconProps } from '@elastic/eui';

/**
 * app ids shared by all solutions
 */
export enum AppIds {
  INGEST_PIPELINES = 'ingest_pipelines',
  PIPELINES = 'pipelines',
  INDEX_MANAGEMENT = 'index_management',
  TRANSFORM = 'transform',
  ML = 'jobsListLink',
  SAVED_OBJECTS = 'objects',
  TAGS = 'tags',
  FILES_MANAGEMENT = 'filesManagement',
  DATA_VIEWS = 'dataViews',
  REPORTING = 'reporting',
  CONNECTORS = 'triggersActionsConnectors',
  RULES = 'triggersActions',
  MAINTENANCE_WINDOWS = 'maintenanceWindows',
  SERVERLESS_SETTINGS = 'settings',
  ROLES = 'roles',
  API_KEYS = 'api_keys',
  DATA_QUALITY = 'data_quality',
  SPACES = 'spaces',
}

// Create new type that is a union of all the appId values
export type AppId = `${AppIds}`;

export const appCategories = {
  DATA: 'data',
  ACCESS: 'access',
  ALERTS: 'alerts',
  CONTENT: 'content',
  OTHER: 'other',
} as const;

export interface Application {
  id: string;
  title: string;
  basePath: string;
  enabled: boolean;
}

export interface AppRegistrySections {
  id?: string;
  title?: string;
  apps: Application[];
}

export interface CardsNavigationComponentProps {
  sections: AppRegistrySections[];
  appBasePath: string;
  onCardClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  hideLinksTo?: AppId[];
  extendedCardNavigationDefinitions?: Record<string, CardNavExtensionDefinition>;
}

export interface ManagementAppProps {
  id: string;
  title: string;
  href: string;
}

export interface AppDefinition {
  category: (typeof appCategories)[keyof typeof appCategories];
  description: string;
  icon: EuiIconProps['type'];
}

export type CardNavExtensionDefinition = AppDefinition &
  (
    | {
        /**
         * Optional prop that indicates if the card nav definition being declared,
         * skips validation to ascertain it's key is a valid id for a management app.
         */
        skipValidation?: false;
      }
    | {
        skipValidation: true;
        /**
         * Specify the url that the card nav being defined should route to,
         * and is only expected when the value of {@link skipValidation} prop is passed true.
         */
        href: string;
        /**
         * Defines the title of the card nav being defined,
         * and is only expected when the {@link skipValidation} prop value is true.
         */
        title: string;
      }
  );

export type AppProps = ManagementAppProps & (AppDefinition | CardNavExtensionDefinition);
