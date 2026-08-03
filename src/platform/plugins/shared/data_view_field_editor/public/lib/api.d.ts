import type { HttpSetup } from '@kbn/core/public';
import type { PainlessExecuteContext, FieldPreviewResponse } from '../components/preview';
export declare const initApi: (httpClient: HttpSetup) => {
    getFieldPreview: ({ index, context, script, document, }: {
        index: string;
        context: PainlessExecuteContext;
        script: {
            source: string;
        } | null;
        document: Record<string, unknown>;
    }) => Promise<import("../../../es_ui_shared/public").SendRequestResponse<FieldPreviewResponse, any>>;
};
export type ApiService = ReturnType<typeof initApi>;
