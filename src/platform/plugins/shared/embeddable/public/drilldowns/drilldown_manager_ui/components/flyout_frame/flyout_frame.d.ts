import type { FC, PropsWithChildren } from 'react';
import React from 'react';
export interface FlyoutFrameProps {
    title?: React.ReactNode;
    footer?: React.ReactNode;
    banner?: React.ReactNode;
    onClose?: () => void;
    onBack?: () => void;
}
/**
 * @todo This component can be moved to `kibana_react`.
 */
export declare const FlyoutFrame: FC<PropsWithChildren<FlyoutFrameProps>>;
