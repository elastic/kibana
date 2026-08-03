import _ from 'lodash';
import React, { Component } from 'react';
import type { Required } from '@kbn/utility-types';
import type { EuiComboBoxProps } from '@elastic/eui';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
export type IndexPatternSelectProps = Required<Omit<EuiComboBoxProps<any>, 'onSearchChange' | 'options' | 'selectedOptions' | 'onChange'>, 'placeholder'> & {
    onChange: (indexPatternId?: string) => void;
    indexPatternId: string;
    onNoIndexPatterns?: () => void;
};
export type IndexPatternSelectInternalProps = IndexPatternSelectProps & {
    indexPatternService: DataViewsContract;
};
interface IndexPatternSelectState {
    isLoading: boolean;
    options: Array<{
        value: string;
        label: string;
    }>;
    selectedIndexPattern: {
        value: string;
        label: string;
    } | undefined;
    searchValue: string | undefined;
}
export declare class IndexPatternSelect extends Component<IndexPatternSelectInternalProps> {
    private isMounted;
    state: IndexPatternSelectState;
    constructor(props: IndexPatternSelectInternalProps);
    componentWillUnmount(): void;
    componentDidMount(): void;
    UNSAFE_componentWillReceiveProps(nextProps: IndexPatternSelectInternalProps): void;
    fetchSelectedIndexPattern: (indexPatternId: string) => Promise<void>;
    debouncedFetch: _.DebouncedFunc<(searchValue: string) => Promise<void>>;
    fetchOptions: (searchValue?: string) => void;
    onChange: (selectedOptions: any) => void;
    render(): React.JSX.Element;
}
export {};
