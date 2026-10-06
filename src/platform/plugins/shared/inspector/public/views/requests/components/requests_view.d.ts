import React, { Component } from 'react';
import type { Request } from '../../../../common/adapters/request/types';
import type { InspectorViewProps } from '../../../types';
interface RequestSelectorState {
    requests: Request[];
    request: Request | null;
}
export declare class RequestsViewComponent extends Component<InspectorViewProps, RequestSelectorState> {
    constructor(props: InspectorViewProps);
    getRequests(): Request[];
    _onRequestsChange: () => void;
    selectRequest: (request: Request) => void;
    componentWillUnmount(): void;
    static renderEmptyRequests(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
