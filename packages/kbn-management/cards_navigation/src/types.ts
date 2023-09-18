/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AppId } from './consts';

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
}

export interface ManagementAppProps {
  id: string;
  title: string;
  href: string;
}

export interface AppDefinition {
  category: string;
  description: string;
  icon: React.ReactElement;
}

export type AppProps = ManagementAppProps & AppDefinition;
