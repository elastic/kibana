import { BaseTemplate } from './base_template';
interface ComponentTemplateResponse {
    component_templates?: Array<{
        name: string;
    }>;
}
export declare class ComponentTemplate extends BaseTemplate<ComponentTemplateResponse> {
    loadTemplates: (templates: ComponentTemplateResponse) => void;
}
export {};
