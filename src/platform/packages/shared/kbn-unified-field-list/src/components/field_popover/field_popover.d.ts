import React from 'react';
import type { EuiPopoverProps } from '@elastic/eui';
export interface FieldPopoverProps extends EuiPopoverProps {
    renderHeader?: () => React.ReactNode;
    renderContent?: () => React.ReactNode;
    renderFooter?: () => React.ReactNode;
}
export declare const FieldPopover: React.FC<FieldPopoverProps>;
