import type { errors } from '@elastic/elasticsearch';
export interface OutputError {
    message: string;
    statusCode: number;
}
export declare const transformError: (err: Error & Partial<errors.ResponseError>) => OutputError;
