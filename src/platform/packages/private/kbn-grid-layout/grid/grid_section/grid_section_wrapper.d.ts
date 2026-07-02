import React from 'react';
export interface GridSectionProps {
    sectionId: string;
}
/**
 * This component "wraps" all the panels in a given section and it is used to:
 * 1. Apply styling to a targeted section via the `kbnGridSection--targeted` class name
 * 2. Apply styling to sections where dropping is blocked via the `kbnGridSection--blocked` class name
 * 3. The ref to this component is used to figure out which section is being targeted
 */
export declare const GridSectionWrapper: React.MemoExoticComponent<({ sectionId }: GridSectionProps) => React.JSX.Element>;
