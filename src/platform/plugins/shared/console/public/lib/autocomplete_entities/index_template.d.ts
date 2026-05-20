import { BaseTemplate } from './base_template';
interface IndexTemplateResponse {
    index_templates?: Array<{
        name: string;
    }>;
}
export declare class IndexTemplate extends BaseTemplate<IndexTemplateResponse> {
    loadTemplates: (templates: IndexTemplateResponse) => void;
}
export {};
