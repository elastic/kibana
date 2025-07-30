/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  HasEditCapabilities,
  HasLibraryTransforms,
  HasType,
  PublishesDescription,
  PublishesTitle,
  PublishesSavedObjectId,
  PublishesUnifiedSearch,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { HasSerializedChildState, PresentationContainer } from '@kbn/presentation-containers';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { DASHBOARD_API_TYPE } from '@kbn/dashboard-plugin/public';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/server';

import { CONTENT_ID } from '../common';
import { Link, LinksAttributes, LinksLayoutType } from '../common/content_management';

export type LinksParentApi = PresentationContainer &
  HasType<typeof DASHBOARD_API_TYPE> &
  HasSerializedChildState<LinksSerializedState> &
  PublishesSavedObjectId &
  PublishesTitle &
  PublishesDescription &
  PublishesUnifiedSearch & {
    locator?: Pick<LocatorPublic<DashboardLocatorParams>, 'navigate' | 'getRedirectUrl'>;
  };

export type LinksApi = HasType<typeof CONTENT_ID> &
  DefaultEmbeddableApi<LinksSerializedState> &
  HasEditCapabilities &
  HasLibraryTransforms<LinksByReferenceSerializedState, LinksByValueSerializedState>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LinksByReferenceSerializedState {}

export interface LinksByValueSerializedState {
  attributes: LinksAttributes;
}

export type LinksSerializedState = SerializedTitles &
  (LinksByReferenceSerializedState | LinksByValueSerializedState);

export interface LinksRuntimeState extends SerializedTitles {
  links?: ResolvedLink[];
  layout?: LinksLayoutType;
  defaultTitle?: string;
  defaultDescription?: string;
  savedObjectId?: string;
}

export type ResolvedLink = Link & {
  title: string;
  label?: string;
  description?: string;
  error?: Error;
};

export interface DashboardItem {
  id: string;
  attributes: Pick<DashboardAttributes, 'title' | 'description' | 'timeRestore'>;
}
