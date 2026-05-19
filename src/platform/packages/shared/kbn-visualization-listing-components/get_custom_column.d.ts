import React from 'react';
import type { VisualizationListItem } from './types';
export declare const getCustomColumn: () => {
    field: string;
    name: string;
    sortable: boolean;
    className: string;
    minWidth: string;
    width: string;
    maxWidth: string;
    render: (field: string, record: VisualizationListItem) => React.JSX.Element;
};
