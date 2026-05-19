import type { ESQLCallbacks } from '@kbn/esql-types';
export interface QuickFix {
    title: string;
    fixQuery: (query: string) => string;
    displayCondition?: (query: string, callbacks: ESQLCallbacks) => Promise<boolean>;
}
