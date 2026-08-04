import type { ParsedTemplate } from './parse_template';
/**
 * Matches `__install__.<name>` install-time placeholders in a workflow template
 * body. The capture group is the `<name>`. Global, so `String.replace` resolves
 * every occurrence; use `.source` (which ignores flags) when a single anchored
 * pattern is needed elsewhere.
 */
export declare const INSTALL_PLACEHOLDER: RegExp;
export interface RenderTemplateInput {
    template: ParsedTemplate;
    /**
     * Values to substitute for `__install__.<name>` references, keyed by field
     * name. When a name has no value here, the field's `default` (from
     * `template-metadata.install.form`) is used; when neither exists, the
     * `<name>` placeholder is emitted for display.
     */
    values?: Record<string, unknown>;
}
/**
 * Render a workflow template into plain workflow YAML.
 *
 * Works on the original `raw` string (never a parse-and-dump round trip) so the
 * author's comments and exact indentation in the workflow body are preserved
 * byte-for-byte. Two transforms are applied:
 *
 *  1. The `template-metadata` block — and any comments inside it — is removed.
 *  2. Every `__install__.<name>` reference is resolved to, in order: the
 *     matching entry in `values`, the field's `default`, or the `<name>`
 *     placeholder.
 */
export declare function renderTemplate({ template, values }: RenderTemplateInput): string;
/**
 * Remove the top-level `template-metadata` block from a template YAML string.
 *
 * The block's boundaries come from the parsed AST — the `template-metadata`
 * pair's source range, from the key start to the value end — so its nested
 * content and inner comments are removed precisely while the rest of the
 * document (body comments, blank lines, indentation) is spliced back
 * byte-for-byte. Falls back to returning the input unchanged when the block or
 * its range cannot be resolved.
 *
 * Exported for `render_install.ts` (the strict install-time renderer), not
 * part of the package public API.
 */
export declare function stripMetadataBlock(raw: string): string;
