/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CanExpandPanels, PresentationContainer } from '@kbn/presentation-containers';
import {
  PublishesDataViews,
  PublishesPanelTitle,
  PublishesSavedObjectId,
  PublishesUnifiedSearch,
  PublishesViewMode,
  PublishingSubject,
} from '@kbn/presentation-publishing';

export type DashboardApi = CanExpandPanels &
  PresentationContainer &
  PublishesDataViews &
  Pick<PublishesPanelTitle, 'panelTitle'> &
  PublishesSavedObjectId &
  PublishesUnifiedSearch &
  PublishesViewMode & {
    fullScreenMode$: PublishingSubject<boolean | undefined>;
    focusedPanelId$: PublishingSubject<string | undefined>;
    managed$: PublishingSubject<boolean | undefined>;
  };
