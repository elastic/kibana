import React from 'react';
interface ShortcutLineFlexItemProps {
    id: string;
    description: string;
    keys: any[];
    alternativeKeys?: any[];
}
export declare const ShortcutLineFlexItem: ({ id, description, keys, alternativeKeys, }: ShortcutLineFlexItemProps) => React.JSX.Element;
export {};
