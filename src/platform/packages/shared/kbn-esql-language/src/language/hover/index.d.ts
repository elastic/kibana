import type { ESQLCallbacks } from '@kbn/esql-types';
export declare function getHoverItem(fullText: string, offset: number, callbacks?: ESQLCallbacks): Promise<{
    contents: Array<{
        value: string;
    }>;
}>;
