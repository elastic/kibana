/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  HasEditCapabilities,
  HasInPlaceLibraryTransforms,
  HasType,
  PublishesPanelDescription,
  PublishesPanelTitle,
  PublishesSavedObjectId,
  PublishesUnifiedSearch,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import type { HasSerializedChildState, PresentationContainer } from '@kbn/presentation-containers';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DashboardLocatorParams, DASHBOARD_API_TYPE } from '@kbn/dashboard-plugin/public';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/server';

import type { CONTENT_ID } from '../common';
import type { Link, LinksAttributes, LinksLayoutType } from '../common/content_management';

export type LinksParentApi = PresentationContainer &
  HasType<typeof DASHBOARD_API_TYPE> &
  HasSerializedChildState<LinksSerializedState> &
  PublishesSavedObjectId &
  PublishesPanelTitle &
  PublishesPanelDescription &
  PublishesUnifiedSearch & {
    locator?: Pick<LocatorPublic<DashboardLocatorParams>, 'navigate' | 'getRedirectUrl'>;
  };

export type LinksApi = HasType<typeof CONTENT_ID> &
  DefaultEmbeddableApi<LinksSerializedState, LinksRuntimeState> &
  HasEditCapabilities &
  HasInPlaceLibraryTransforms<LinksRuntimeState>;

export interface LinksByReferenceSerializedState {
  savedObjectId: string;
}

export interface LinksByValueSerializedState {
  attributes: LinksAttributes;
}

export type LinksSerializedState = SerializedTitles &
  Partial<DynamicActionsSerializedState> &
  (LinksByReferenceSerializedState | LinksByValueSerializedState);

export interface LinksRuntimeState
  extends Partial<LinksByReferenceSerializedState>,
    SerializedTitles {
  error?: Error;
  links?: ResolvedLink[];
  layout?: LinksLayoutType;
  defaultPanelTitle?: string;
  defaultPanelDescription?: string;
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
