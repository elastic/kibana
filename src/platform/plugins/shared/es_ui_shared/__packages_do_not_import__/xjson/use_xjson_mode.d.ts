import type { Dispatch } from 'react';
import { collapseLiteralStrings } from './json_xjson_translation_tools';
interface ReturnValue {
    xJson: string;
    setXJson: Dispatch<string>;
    convertToJson: typeof collapseLiteralStrings;
}
export declare const useXJsonMode: (json: Record<string, any> | string | null) => ReturnValue;
export {};
