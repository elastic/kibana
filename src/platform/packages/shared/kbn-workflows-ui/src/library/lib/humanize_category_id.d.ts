/**
 * Turn a kebab-case category id into a display label (e.g. `threat-intel` →
 * `Threat Intel`). Rendering the canonical `library/categories.yaml` names is a
 * known follow-up.
 */
export declare function humanizeCategoryId(id: string): string;
