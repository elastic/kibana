import React from 'react';
import type { estypes } from '@elastic/elasticsearch';
import type { CoreStart } from '@kbn/core/public';
import type { IEsError } from './types';
import { EsError } from './es_error';
export declare class TsdbError extends EsError {
    private readonly docLinks;
    constructor(err: IEsError, openInInspector: () => void, tsdbCause: estypes.ErrorCause, docLinks: CoreStart['docLinks']);
    getErrorMessage(): React.JSX.Element;
}
