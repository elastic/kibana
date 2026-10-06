import React from 'react';
import type { estypes } from '@elastic/elasticsearch';
import type { ApplicationStart } from '@kbn/core/public';
import type { AbstractDataView } from '@kbn/data-views-plugin/common';
import type { IEsError } from './types';
import { EsError } from './es_error';
export declare class PainlessError extends EsError {
    private readonly applicationStart;
    private readonly painlessCause;
    private readonly dataView?;
    constructor(err: IEsError, openInInspector: () => void, painlessCause: estypes.ErrorCause, applicationStart: ApplicationStart, dataView?: AbstractDataView);
    getErrorMessage(): React.JSX.Element;
    getActions(): React.JSX.Element[];
}
