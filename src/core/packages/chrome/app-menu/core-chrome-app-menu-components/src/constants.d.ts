/**
 * The maximum number of item slots on the left side of the app menu.
 * - If the number of items is within this limit, all items are shown.
 * - If the number of items exceeds this limit, one slot is reserved for the overflow
 *   button, so only (limit - 1) items are visible and the rest go into the overflow popover.
 * The primary action button is on the right side and does not count towards this limit.
 */
export declare const APP_MENU_ITEM_LIMIT = 3;
export declare const DEFAULT_POPOVER_WIDTH = 200;
export declare const APP_MENU_SHARE_ID = "share";
