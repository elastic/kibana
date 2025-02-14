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
import { DashboardLocatorParams, DASHBOARD_API_TYPE } from '@kbn/dashboard-plugin/public';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/server';

import { CONTENT_ID } from '../common';
import { Link, LinksLayoutType } from '../common/content_management';
import { LinksByReferenceSerializedState, LinksSerializedState } from '../common/types';

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
  DefaultEmbeddableApi<LinksSerializedState, LinksRuntimeState> &
  HasEditCapabilities &
  HasLibraryTransforms<LinksByReferenceSerializedState, LinksByValueSerializedState>;

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
