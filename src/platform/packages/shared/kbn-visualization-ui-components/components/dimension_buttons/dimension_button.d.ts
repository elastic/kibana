import React from 'react';
import type { AccessorConfig, Message } from './types';
export interface DimensionButtonProps {
    className?: string;
    groupLabel: string;
    children: React.ReactElement;
    onClick: (id: string) => void;
    onRemoveClick: (id: string) => void;
    accessorConfig: AccessorConfig;
    label: string;
    message?: Message;
}
declare function DimensionButtonImpl({ groupLabel, children, onClick, onRemoveClick, accessorConfig, label, message, ...otherProps }: DimensionButtonProps): React.JSX.Element;
export declare const DimensionButton: React.MemoExoticComponent<typeof DimensionButtonImpl>;
export {};
