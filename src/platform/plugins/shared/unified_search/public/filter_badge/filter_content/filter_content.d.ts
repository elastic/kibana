import React from 'react';
import type { Filter } from '@kbn/es-query';
export interface FilterContentProps {
    filter: Filter;
    valueLabel: string;
    fieldLabel?: string;
    hideAlias?: boolean;
}
export declare function FilterContent({ filter, valueLabel, fieldLabel, hideAlias }: FilterContentProps): React.JSX.Element;
