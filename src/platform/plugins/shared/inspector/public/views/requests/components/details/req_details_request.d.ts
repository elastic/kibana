import React, { Component } from 'react';
import type { Request } from '../../../../../common/adapters/request/types';
import type { DetailViewProps } from './types';
export declare class RequestDetailsRequest extends Component<DetailViewProps> {
    static shouldShow: (request: Request) => boolean;
    render(): React.JSX.Element | null;
}
