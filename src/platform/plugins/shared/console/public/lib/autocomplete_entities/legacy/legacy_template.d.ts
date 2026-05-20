import type { IndicesGetTemplateResponse } from '@elastic/elasticsearch/lib/api/types';
import { BaseTemplate } from '../base_template';
export declare class LegacyTemplate extends BaseTemplate<IndicesGetTemplateResponse> {
    loadTemplates: (templates: IndicesGetTemplateResponse) => void;
}
