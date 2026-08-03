import React from 'react';
import { Pager } from '@elastic/eui';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { MatchedItem } from '@kbn/data-views-plugin/public';
export interface IndicesListProps {
    indices: MatchedItem[];
    query: string;
    isExactMatch: (indexName: string) => boolean;
}
interface IndicesListState {
    page: number;
    perPage: number;
}
export declare const PER_PAGE_STORAGE_KEY = "dataViews.previewPanel.indicesPerPage";
export declare class IndicesList extends React.Component<IndicesListProps, IndicesListState> {
    pager: Pager;
    storage: Storage;
    idGenerator: (idSuffix?: string) => string;
    constructor(props: IndicesListProps);
    UNSAFE_componentWillReceiveProps(nextProps: IndicesListProps): void;
    resetPageTo0: () => void;
    onChangePage: (page: number) => void;
    onChangePerPage: (perPage: number) => void;
    renderPagination(indicesTableId: string): React.JSX.Element;
    highlightIndexName(indexName: string, query: string): string | React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
