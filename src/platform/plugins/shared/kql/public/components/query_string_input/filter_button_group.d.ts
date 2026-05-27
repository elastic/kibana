import type { FC, ReactNode } from 'react';
interface Props {
    items: ReactNode[];
    /**
     * Displays the last item without a border radius as if attached to the next DOM node
     */
    attached?: boolean;
    /**
     * Matches overall height with standard form/button sizes
     */
    size?: 'm' | 's';
}
export declare const FilterButtonGroup: FC<Props>;
export {};
