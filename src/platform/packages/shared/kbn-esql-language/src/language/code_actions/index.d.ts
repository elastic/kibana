import type { ESQLCallbacks } from '@kbn/esql-types';
export interface EsqlCodeAction {
    title: string;
    fixedText: string;
}
/**
 * Computes the quick-fix code actions associated with an ESQLMessage.
 */
export declare function getQuickFixForMessage({ queryString, message, callbacks, }: {
    queryString: string;
    message: {
        code: string;
    };
    callbacks?: ESQLCallbacks;
}): Promise<EsqlCodeAction | undefined>;
