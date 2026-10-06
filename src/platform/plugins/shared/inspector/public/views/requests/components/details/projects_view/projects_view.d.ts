import React from 'react';
import type { Request } from '../../../../../../common/adapters/request/types';
import type { DetailViewProps } from '../types';
export declare function ProjectsView({ request }: DetailViewProps): React.JSX.Element;
export declare namespace ProjectsView {
    var shouldShow: (request: Request, isCpsMultiProject?: boolean) => boolean;
}
