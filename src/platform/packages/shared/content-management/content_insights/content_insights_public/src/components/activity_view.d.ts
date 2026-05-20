import React from 'react';
import type { Item } from '../types';
export interface ActivityViewProps {
    item: Pick<Partial<Item>, 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt' | 'managed'>;
    entityNamePlural?: string;
}
export declare const ActivityView: ({ item, entityNamePlural }: ActivityViewProps) => React.JSX.Element;
