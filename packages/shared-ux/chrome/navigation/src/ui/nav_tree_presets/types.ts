/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ChromeProjectNavigationLink } from '@kbn/core-chrome-browser';
import type { DeepLinkId as DevToolsLink } from '@kbn/deeplinks-devtools';
import type { DeepLinkId as AnalyticsDeepLink } from '@kbn/deeplinks-analytics';

import type { NodeDefinition } from '../types';
import type { ID as AnalyticsID } from './analytics';
import type { ID as DevtoolsID } from './devtools';
import type { ID as ManagementID } from './management';
import type { ID as MlID } from './ml';

export type NodeDefinitionWithChildren<
  LinkId extends ChromeProjectNavigationLink = ChromeProjectNavigationLink,
  Id extends ChromeProjectNavigationLink = LinkId,
  ChildrenID extends ChromeProjectNavigationLink = Id
> = NodeDefinition<LinkId, Id, ChildrenID> & {
  children: Required<NodeDefinition<LinkId, Id, ChildrenID>>['children'];
};

export type AnalyticsNodeDefinition = NodeDefinitionWithChildren<AnalyticsDeepLink, AnalyticsID>;

export type DevToolsNodeDefinition = NodeDefinitionWithChildren<DevToolsLink, DevtoolsID>;

export type ManagementNodeDefinition = NodeDefinitionWithChildren<
  ChromeProjectNavigationLink,
  ManagementID
>;

export type MlNodeDefinition = NodeDefinitionWithChildren<ChromeProjectNavigationLink, MlID>;
