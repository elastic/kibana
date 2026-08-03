import React from 'react';
import type { Template } from '@kbn/workflows-library';
export interface TemplateCardProps {
    template: Template;
    onSelect: (template: Template) => void;
}
export declare const TemplateCard: React.NamedExoticComponent<TemplateCardProps>;
