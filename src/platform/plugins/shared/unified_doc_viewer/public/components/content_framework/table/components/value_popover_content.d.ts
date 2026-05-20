import React from 'react';
import type { TableFieldConfiguration } from '..';
interface ValuePopoveContentProps {
    fieldConfig: TableFieldConfiguration;
    cellActions: React.ReactNode;
}
export declare function ValuePopoverContent({ fieldConfig, cellActions }: ValuePopoveContentProps): React.JSX.Element;
export {};
