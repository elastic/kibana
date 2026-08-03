import React from 'react';
export interface TemplateCardTagsProps {
    categories: string[];
}
/**
 * Renders a template's category tags on a single row. Tags that don't fit are
 * collapsed into a trailing "+N" counter badge (e.g. `root-cause-analysis`,
 * `ai-agent` `+1`). The fit is measured against the available width and
 * recomputed whenever the card resizes.
 */
export declare const TemplateCardTags: React.NamedExoticComponent<TemplateCardTagsProps>;
