import React from 'react';
import type { TemplateBody } from '@kbn/workflows-library';
export interface TemplateDetailProps {
    slug: string;
    /** Called once the template body has loaded — e.g. to set breadcrumbs. */
    onLoaded?: (template: TemplateBody) => void;
    /**
     * Rendered at the top of the left column (e.g. a "Back to library" link). Kept
     * as a slot so navigation stays in the host app while this component owns the
     * full two-column layout (letting the preview panel reach the top of the page).
     */
    backButton?: React.ReactNode;
    /** Enables the graph/YAML preview toggle. Defaults to YAML-only when false. */
    showGraphPreview?: boolean;
}
/**
 * Workflow Template Library detail view: friendly template metadata (solution
 * and category badges, step/trigger icons) plus a read-only preview of the
 * template's workflow definition.
 */
export declare const TemplateDetail: React.NamedExoticComponent<TemplateDetailProps>;
