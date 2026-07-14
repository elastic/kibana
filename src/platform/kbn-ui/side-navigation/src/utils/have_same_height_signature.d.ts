import type { MenuItem } from '../../types';
/**
 * Pre-check to see if the item's height might have changed and if we need to do a full recalculation.
 *
 * @param prev - previous menu items.
 * @param next - next menu items.
 * @returns (boolean) whether the menu items have the same height signature.
 */
export declare const haveSameHeightSignature: (prev: MenuItem[], next: MenuItem[]) => boolean;
