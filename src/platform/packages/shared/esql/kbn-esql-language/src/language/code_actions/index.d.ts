import type { ESQLCallbacks } from '@kbn/esql-types';
import type { QuickFixMessage } from './types';
export interface EsqlCodeAction {
    title: string;
    fixedText: string;
}
/**
 * Computes the quick-fix code actions associated with an ESQLMessage.
 */
export declare function getQuickFixesForMessage({ queryString, message, callbacks, }: {
    queryString: string;
    message: QuickFixMessage;
    callbacks?: ESQLCallbacks;
}): Promise<EsqlCodeAction[]>;
