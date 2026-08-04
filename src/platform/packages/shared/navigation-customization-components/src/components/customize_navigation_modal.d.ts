import React from 'react';
import type { NavigationItemInfo } from '../types';
interface Props {
    items: NavigationItemInfo[];
    onSave: (order: string[], hiddenIds: string[]) => void;
    onReset: () => Promise<NavigationItemInfo[]>;
    onChange: (order: string[], hiddenIds: string[]) => void;
    onClose: () => void;
}
export declare const CustomizeNavigationModal: ({ items: initialItems, onSave, onReset, onChange, onClose, }: Props) => React.JSX.Element;
export {};
