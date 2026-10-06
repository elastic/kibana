import type { ESQLAstItem } from '@elastic/esql/types';
import { type ISuggestionItem } from '../types';
export declare const getCompletionItemsBySettingName: (settingName: string, innerText: string, settingRightSide: ESQLAstItem | null) => ISuggestionItem[];
