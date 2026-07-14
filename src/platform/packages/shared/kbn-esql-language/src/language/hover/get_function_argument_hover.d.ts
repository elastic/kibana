import type { ESQLAstItem, ESQLFunction } from '@elastic/esql/types';
export declare const findArgumentAtOffset: (args: ESQLAstItem[], targetOffset: number) => ESQLAstItem | null;
export declare function getFunctionArgumentHover(fnNode: ESQLFunction, offset: number): Promise<Array<{
    value: string;
}>>;
