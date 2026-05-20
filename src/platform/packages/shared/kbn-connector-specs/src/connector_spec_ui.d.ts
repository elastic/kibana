/**
 * Stack Connectors 2.0 - UI Metadata Extension System
 *
 * This file contains the Zod metadata extension system that enables
 * UI to be fully derived from schemas.
 *
 * WHY SEPARATE FILE: UI concerns are orthogonal to connector logic.
 * This allows the main spec to focus on connector behavior while
 * UI derivation is handled here.
 */
import { z } from '@kbn/zod/v4';
export declare enum WidgetType {
    Text = "text",
    Password = "password",
    Select = "select",
    FormFieldset = "formFieldset",
    KeyValue = "keyValue",
    FileUpload = "fileUpload"
}
export interface BaseMetadata {
    widget?: WidgetType | string;
    label?: string;
    placeholder?: string;
    helpText?: string;
    disabled?: boolean;
    sensitive?: boolean;
    order?: number;
    hidden?: boolean;
    validate?: {
        allowedHosts?: boolean;
    };
    [x: string]: unknown;
}
export declare function getMeta(schema: z.ZodType): BaseMetadata;
export declare function setMeta<T extends z.ZodType>(schema: T, meta: BaseMetadata): T;
export declare function addMeta<T extends z.ZodType>(schema: T, meta: Partial<BaseMetadata>): T;
/**
 * Extended Zod type definition with UI metadata
 *
 * WHY: Zod schemas alone can derive most UI (field type, validation, labels),
 * but some UI concerns can't be inferred from types alone:
 * - Is this string a password? (needs masking)
 * - Should this string be a textarea or single-line input?
 * - What's the placeholder text? (different from label)
 * - Which section does this field belong to?
 *
 * This metadata extension allows schemas to carry UI hints while remaining
 * completely optional - fields without metadata get sensible defaults.
 */
declare module '@kbn/zod/v4' {
    interface GlobalMeta extends BaseMetadata {
        [key: string]: unknown;
    }
}
/**
 * Pre-configured schema types for common field patterns
 * WHY: Reduces boilerplate for frequently used field types
 * These use Zod's built-in .meta() to attach UI metadata
 *
 * @example
 * const apiKey = z.string().meta({ sensitive: true, placeholder: "sk-..." });
 * // Or use the helper:
 * const apiKey = UISchemas.secret("sk-...");
 */
export declare const UISchemas: {
    /**
     * Secret/password field - automatically masked in UI
     * USED BY: All connectors with API keys/tokens (Slack, OpenAI, Jira, etc.)
     * @example secrets: { apiKey: UISchemas.secret().describe("API Key") }
     */
    secret: (placeholder?: string) => z.ZodString;
    /**
     * Multi-line text field
     * USED BY: Webhook, Slack (message body), Teams (message text)
     * @example message: UISchemas.textarea({ rows: 5 }).describe("Message body")
     */
    textarea: (options?: {
        rows?: number;
    }) => z.ZodString;
    /**
     * JSON editor field with syntax highlighting
     * USED BY: Webhook (body), OpenAI (functions), Slack (blocks)
     * @example config: UISchemas.json().describe("Configuration object")
     */
    json: () => z.ZodString;
    /**
     * Code editor field
     * USED BY: Tines (custom scripts), TheHive (case templates)
     * @example script: UISchemas.code("javascript").describe("Custom script")
     */
    code: (language: "javascript" | "typescript" | "python") => z.ZodString;
    /**
     * URL field with validation
     * USED BY: All webhook-based connectors (Webhook, Cases Webhook, Slack webhook)
     * @example webhookUrl: UISchemas.url().describe("Webhook URL")
     */
    url: (placeholder?: string) => z.ZodURL;
};
