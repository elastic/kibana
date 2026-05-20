import React from 'react';
interface BadgeGroupProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    isNoValue?: (item: T) => boolean;
}
export declare const BadgeGroup: <T>({ items, renderItem, isNoValue }: BadgeGroupProps<T>) => React.JSX.Element;
export {};
