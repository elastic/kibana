/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The maximum number of item slots on the left side of the app menu.
 * - If the number of items is within this limit, all items are shown.
 * - If the number of items exceeds this limit, one slot is reserved for the overflow
 *   button, so only (limit - 1) items are visible and the rest go into the overflow popover.
 * The primary action button is on the right side and does not count towards this limit.
 */
export const APP_MENU_ITEM_LIMIT = 3;
export const APP_MENU_NOTIFICATION_INDICATOR_TOP = 2;
export const APP_MENU_NOTIFICATION_INDICATOR_LEFT = 25;
export const DEFAULT_POPOVER_WIDTH = 200;
export const APP_MENU_SHARE_ID = 'share';
