import type { ESQLCallbacks } from '@kbn/esql-types';
interface HoverContent {
    contents: Array<{
        value: string;
    }>;
}
export declare function getHoverItem(fullText: string, offset: number, callbacks?: ESQLCallbacks): Promise<HoverContent>;
export {};
