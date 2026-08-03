import type { UnifiedChangePointGridProps } from '../types';
/**
 * Derives change point cards and series columns from the current fetch params.
 * Memoizes on (query, table) so re-derivation only happens when Discover delivers
 * new data, not on every render.
 */
export declare const useChangePointCards: (fetchParams: UnifiedChangePointGridProps["fetchParams"]) => {
    cards: import("../utils/derive_change_point_cards").ChangePointCardModel[] | undefined;
    seriesColumns: {
        valueColumn: string;
        timeColumn: string;
    } | undefined;
};
