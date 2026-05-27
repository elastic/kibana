import React, { Component } from 'react';
import type { Request } from '../../../../../common/adapters/request/types';
import type { DetailViewProps } from './types';
export declare class RequestDetailsResponse extends Component<DetailViewProps> {
    static shouldShow: (request: Request) => boolean;
    static getResponseJson: (request: Request) => object | null | undefined;
    render(): React.JSX.Element | null;
}
