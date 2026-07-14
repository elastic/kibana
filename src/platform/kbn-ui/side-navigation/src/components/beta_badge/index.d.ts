import React from 'react';
import type { BadgeType } from '../../../types';
interface BetaBadgeProps {
    type: BadgeType;
    isInverted?: boolean;
    alignment?: 'bottom' | 'text-bottom';
}
/**
 * A badge to indicate that a feature is in beta, tech preview, or new.
 * It can be aligned to the middle or bottom of the text.
 */
export declare const BetaBadge: ({ type, isInverted, alignment }: BetaBadgeProps) => React.JSX.Element;
export {};
