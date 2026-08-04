import type { ReactNode } from 'react';
/**
 * Props for the {@link Filters} container component.
 */
export interface FiltersProps {
    /** Filter declarative components as children. */
    children?: ReactNode;
}
export declare const Filters: import("react").FC<FiltersProps> & {
    Sort: import("react").FC<import("./part").SortFilterProps>;
    Tags: import("react").FC<import("./part").TagFilterProps>;
    Starred: import("react").FC<import("./part").StarredFilterProps>;
    CreatedBy: import("react").FC<import("./part").CreatedByFilterProps>;
};
