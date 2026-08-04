import React from 'react';
import type { NavigationItemInfo } from '../types';
interface Props {
    item: NavigationItemInfo;
    index: number;
    toggleItemVisibility: (id: string) => void;
}
export declare const DraggableItem: ({ item, index, toggleItemVisibility }: Props) => React.JSX.Element;
export {};
