import React from 'react';
import type { MonacoMessage } from '@kbn/code-editor';
import type { DataErrorsControl } from '../types';
export declare function ErrorsWarningsFooterPopover({ isPopoverOpen, items, type, setIsPopoverOpen, onErrorClick, isSpaceReduced, dataErrorsControl, }: {
    isPopoverOpen: boolean;
    items: MonacoMessage[];
    type: 'error' | 'warning';
    setIsPopoverOpen: (flag: boolean) => void;
    onErrorClick: (error: MonacoMessage) => void;
    isSpaceReduced?: boolean;
    dataErrorsControl?: DataErrorsControl;
}): React.JSX.Element;
