import React from 'react';
import type { TableFieldConfiguration } from '..';
interface NamePopoverContentProps {
    fieldName: string;
    fieldConfig: TableFieldConfiguration;
    cellActions: React.ReactNode;
}
export declare function NamePopoverContent({ fieldName, fieldConfig, cellActions, }: NamePopoverContentProps): React.JSX.Element;
export {};
