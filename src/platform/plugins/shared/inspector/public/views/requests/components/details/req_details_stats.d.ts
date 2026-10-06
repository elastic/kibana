import React from 'react';
import type { DetailViewProps } from './types';
import type { Request } from '../../../../../common/adapters/request/types';
export declare function RequestDetailsStats({ request }: DetailViewProps): React.JSX.Element | null;
export declare namespace RequestDetailsStats {
    var shouldShow: (request: Request) => boolean;
}
