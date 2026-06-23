import { type ESQLFunction } from '@elastic/esql/types';
export declare function getFunctionSignatureHover(fnNode: ESQLFunction): Promise<Array<{
    value: string;
}>>;
export declare function getPromqlFunctionSignatureHover(fnName: string): Array<{
    value: string;
}>;
