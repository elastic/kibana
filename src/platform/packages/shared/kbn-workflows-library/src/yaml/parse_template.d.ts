import type { TemplateMetadata } from '../types/catalog';
/**
 * Reason a `parseTemplateYaml` call failed. Kept on the error so callers
 * (the server's library service, the catalog generator) can map to HTTP
 * responses or CI annotations without string-matching the message.
 */
export type TemplateParseErrorReason = 'invalid-yaml' | 'invalid-root' | 'missing-metadata' | 'invalid-metadata';
export declare class TemplateParseError extends Error {
    readonly reason: TemplateParseErrorReason;
    readonly cause?: unknown | undefined;
    constructor(message: string, reason: TemplateParseErrorReason, cause?: unknown | undefined);
}
export interface ParsedTemplate {
    metadata: TemplateMetadata;
    /** The workflow YAML, after stripping the `template-metadata` block. */
    body: Record<string, unknown>;
    /** The original YAML text, surfaced unmodified for preview. */
    raw: string;
}
export interface ParseTemplateOptions {
    /**
     * When `true`, unknown top-level `template-metadata` fields are stripped
     * rather than rejected. Used on the runtime consumption path (the server
     * fetching a body from the CDN) so a field added by a newer publisher does
     * not 503 a template the catalog already lists. Authoring / CI keeps the
     * default strict validation. Defaults to `false`.
     */
    lenient?: boolean;
}
/**
 * Parse a raw template YAML string into its `template-metadata` block (typed
 * and Zod-validated) and the remaining workflow body (preserved as-is).
 *
 * Throws `TemplateParseError` on any failure. The `reason` field distinguishes
 * structural failures (bad YAML, no root object, missing metadata block) from
 * schema failures (metadata present but malformed); the `cause` field carries
 * the underlying error (e.g. the `ZodError`) for diagnostics.
 */
export declare function parseTemplateYaml(raw: string, { lenient }?: ParseTemplateOptions): ParsedTemplate;
