import type { FC, PropsWithChildren } from 'react';
import React from 'react';
export declare const txtIncompatibleTooltip: string;
export interface TriggerLineItemProps {
    tooltip?: React.ReactNode;
    incompatible?: boolean;
}
export declare const TriggerLineItem: FC<PropsWithChildren<TriggerLineItemProps>>;
