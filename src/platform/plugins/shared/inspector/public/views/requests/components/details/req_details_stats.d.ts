import React from 'react';
import type { DetailViewProps } from './types';
import type { Request } from '../../../../../common/adapters/request/types';
export declare const RequestDetailsStats: {
    ({ request }: DetailViewProps): React.JSX.Element | null;
    shouldShow(request: Request): boolean;
};
