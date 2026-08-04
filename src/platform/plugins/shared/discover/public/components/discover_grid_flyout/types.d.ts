import type { IconType } from '@elastic/eui';
import type { MouseEventHandler } from 'react';
export interface FlyoutActionItem {
    id: string;
    enabled: boolean;
    label: string;
    helpText?: string;
    iconType: IconType;
    onClick: (() => void) | MouseEventHandler;
    href?: string;
    dataTestSubj?: string;
}
