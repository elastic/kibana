import type { TemplateBody } from '@kbn/workflows-library';
/**
 * Fetches a single Workflow Template Library template body (parsed metadata +
 * workflow body + raw YAML) by slug. Used by the template detail page.
 */
export declare function useTemplate(slug: string | undefined): import("@tanstack/react-query").UseQueryResult<TemplateBody, unknown>;
