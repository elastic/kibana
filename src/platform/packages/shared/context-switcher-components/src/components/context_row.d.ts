import React from 'react';
import type { ContextRowModel } from './types';
export interface ContextRowProps {
    readonly row: ContextRowModel;
    readonly onClick: () => void;
}
/**
 * The row component for the context switcher that contains the avatar, the title, the subtitle and the chevron.
 */
export declare const ContextRow: ({ row, onClick }: ContextRowProps) => React.JSX.Element;
