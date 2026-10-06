import React from 'react';
import { type EuiBadgeProps } from '@elastic/eui';
import { type FilterExpressionValue } from '../../utils/filter_input_codec';
type FilterBadgeProps = EuiBadgeProps & {
    filter: FilterExpressionValue;
    /**
     * Applies EUI disabled-badge colors without setting isDisabled, so the badge
     * remains clickable (e.g. toggled-off filters that still open the menu).
     */
    isInactive?: boolean;
};
export declare function FilterBadge({ filter, css, iconType, color, isInactive, ...props }: FilterBadgeProps): React.JSX.Element;
export {};
