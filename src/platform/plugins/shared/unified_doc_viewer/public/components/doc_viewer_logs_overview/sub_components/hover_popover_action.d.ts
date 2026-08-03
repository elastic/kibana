import React from 'react';
import type { PopoverAnchorPosition } from '@elastic/eui';
import { type EuiPopoverProps } from '@elastic/eui';
interface HoverPopoverActionProps {
    children: React.ReactChild;
    field: string;
    value: unknown;
    formattedValue?: string;
    rawFieldValue?: unknown;
    title?: unknown;
    anchorPosition?: PopoverAnchorPosition;
    display?: EuiPopoverProps['display'];
    truncate?: boolean;
}
export declare const HoverActionPopover: ({ children, title, field, value, formattedValue, rawFieldValue, anchorPosition, display, truncate, }: HoverPopoverActionProps) => React.JSX.Element;
export {};
