import React from 'react';
import type { IEsError } from './types';
/**
 * Checks if a given errors originated from Elasticsearch.
 * Those params are assigned to the attributes property of an error.
 *
 * @param e
 */
export declare function isEsError(e: any): e is IEsError;
export declare class EsError extends Error {
    readonly attributes: IEsError['attributes'];
    private readonly openInInspector;
    constructor(err: IEsError, message: string, openInInspector: () => void);
    getErrorMessage(): React.JSX.Element;
    getActions(): React.JSX.Element[];
}
