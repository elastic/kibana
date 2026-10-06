import type { ESQLCallbacks } from '@kbn/esql-types';
interface SignatureHelpItem {
    signatures: Array<{
        label: string;
        documentation?: string;
        parameters: Array<{
            label: string;
            documentation?: string;
        }>;
    }>;
    activeSignature: number;
    activeParameter: number;
}
export declare function getSignatureHelp(fullText: string, offset: number, callbacks?: ESQLCallbacks): Promise<SignatureHelpItem | undefined>;
export {};
