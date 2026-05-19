import React from 'react';
import type { FatalError } from '@kbn/core-fatal-errors-browser';
interface GenericErrorProps {
    buildNumber: number;
    errors: FatalError[];
    kibanaVersion: string;
}
export declare function GenericError({ kibanaVersion, buildNumber, errors }: GenericErrorProps): React.JSX.Element;
export {};
