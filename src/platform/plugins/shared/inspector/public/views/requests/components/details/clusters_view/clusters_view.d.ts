import React, { Component } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import { type EuiSearchBarOnChangeArgs } from '@elastic/eui';
import type { Request } from '../../../../../../common/adapters/request/types';
import type { DetailViewProps } from '../types';
interface State {
    clusters: Record<string, estypes.ClusterDetails>;
    showSearchAndStatusBar: boolean;
}
export declare class ClustersView extends Component<DetailViewProps, State> {
    static shouldShow: (request: Request) => boolean;
    constructor(props: DetailViewProps);
    _onSearchChange: ({ query, error }: EuiSearchBarOnChangeArgs) => void;
    render(): React.JSX.Element;
}
export {};
