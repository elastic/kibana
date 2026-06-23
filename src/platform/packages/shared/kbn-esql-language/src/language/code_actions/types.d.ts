import type { ESQLCallbacks } from '@kbn/esql-types';
import type { ESQLMessage } from '../../commands/definitions/types';
export interface QuickFixMessage {
    code: ESQLMessage['code'];
    data?: ESQLMessage['data'];
    location?: ESQLMessage['location'];
}
export interface QuickFix {
    title: string;
    fixQuery: (query: string) => string | undefined;
    displayCondition?: (query: string, callbacks: ESQLCallbacks) => Promise<boolean>;
}
