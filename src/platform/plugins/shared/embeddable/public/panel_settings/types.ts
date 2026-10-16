/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange } from '@kbn/es-query';
import type {
  PublishesWritableDescription,
  PublishesWritableHideBorder,
  PublishesWritableTimeRange,
  PublishesWritableTitle,
} from '@kbn/presentation-publishing';

/**
 * The subset of an embeddable API needed to edit its title, description, border and time range.
 * The time range is optional, as not every panel can have its own time range.
 */
export type PanelSettingsApi = PublishesWritableTitle &
  PublishesWritableDescription &
  PublishesWritableHideBorder &
  Partial<Pick<PublishesWritableTimeRange, 'timeRange$' | 'setTimeRange'>>;

/**
 * Implemented by panels that edit their settings (title, description, border, time range)
 * as part of their edit flow, so the separate panel settings action is not needed in edit mode.
 */
export interface HasPanelSettingsInEditFlyout {
  hasPanelSettingsInEditFlyout: () => boolean;
}

export const apiHasPanelSettingsInEditFlyout = (
  api: unknown
): api is HasPanelSettingsInEditFlyout =>
  typeof (api as HasPanelSettingsInEditFlyout)?.hasPanelSettingsInEditFlyout === 'function';

export const apiSupportsPanelTimeRange = (
  api: PanelSettingsApi
): api is PanelSettingsApi & Pick<PublishesWritableTimeRange, 'timeRange$' | 'setTimeRange'> =>
  Boolean(api.timeRange$ && api.setTimeRange);

export interface PanelSettingsState {
  title?: string;
  hideTitle?: boolean;
  description?: string;
  hideBorder?: boolean;
  hasOwnTimeRange: boolean;
  timeRange?: TimeRange;
}
