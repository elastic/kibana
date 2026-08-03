import React from 'react';
import type { Error } from '@kbn/apm-types';
import type { Mark } from '.';
export interface ErrorMark extends Mark {
    type: 'errorMark';
    error: Error;
    serviceColor: string;
    onClick?: () => void;
    errorMarkerHref?: string;
}
interface Props {
    mark: ErrorMark;
}
export declare function ErrorMarker({ mark }: Props): React.JSX.Element;
export {};
