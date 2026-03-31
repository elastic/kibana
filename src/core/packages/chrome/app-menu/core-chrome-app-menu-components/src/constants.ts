/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The maximum number of items that can be displayed in the app menu before overflowing into
 * "More" popover.
 * If the number of items exceeds this limit, the extra items will be shown in an overflow
 * popover.
 * Primary and secondary action items count towards this limit but always remain visible and are
 * not moved to the overflow popover.
 * The overflow button itself does not count towards this limit.
 * @deprecated The number of visible items will be reduced to 3 in a future release.
 */
export const APP_MENU_ITEM_LIMIT = 5;
export const APP_MENU_NOTIFICATION_INDICATOR_TOP = 2;
export const APP_MENU_NOTIFICATION_INDICATOR_LEFT = 25;
export const DEFAULT_POPOVER_WIDTH = 200;
