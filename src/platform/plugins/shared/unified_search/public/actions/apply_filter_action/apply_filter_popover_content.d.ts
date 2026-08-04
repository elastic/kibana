import React, { Component } from 'react';
import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
interface Props {
    filters: Filter[];
    indexPatterns: DataView[];
    onCancel: () => void;
    onSubmit: (filters: Filter[]) => void;
}
interface State {
    isFilterSelected: boolean[];
    fieldLabel?: string;
}
export declare class ApplyFiltersPopoverContent extends Component<Props, State> {
    static defaultProps: {
        filters: never[];
    };
    constructor(props: Props);
    private getLabel;
    render(): "" | React.JSX.Element;
    private isFilterSelected;
    private toggleFilterSelected;
    private onSubmit;
}
export {};
