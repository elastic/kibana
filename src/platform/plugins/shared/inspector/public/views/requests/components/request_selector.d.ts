import React, { Component } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { Request } from '../../../../common/adapters/request/types';
interface RequestSelectorProps {
    requests: Request[];
    selectedRequest: Request;
    onRequestChanged: (request: Request) => void;
}
export declare class RequestSelector extends Component<RequestSelectorProps> {
    handleSelected: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
    renderRequestCombobox(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
