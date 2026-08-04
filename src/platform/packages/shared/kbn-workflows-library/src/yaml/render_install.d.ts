import type { InstallFormField } from '../types/install_form';
import type { InstallFormFieldError } from './install_form_validation_error';
import type { ParsedTemplate } from './parse_template';
/**
 * Validate resolved install-form values against the declared form.
 *
 * Returns field-level errors instead of throwing so the UI can reuse it for
 * live client-side validation; `renderInstall` throws
 * `InstallFormValidationError` when the result is non-empty.
 */
export declare function validateInstallFormValues(form: InstallFormField[], values: Record<string, unknown>): InstallFormFieldError[];
export interface RenderInstallInput {
    template: ParsedTemplate;
    /** User-submitted form values, keyed by `install.form` field name. */
    values?: Record<string, unknown>;
}
export interface RenderInstallResult {
    /** Fully resolved workflow YAML, ready to feed into the create-workflow path. */
    yaml: string;
    /** The value map actually substituted: submitted values plus applied form defaults. */
    resolved: Record<string, unknown>;
}
/**
 * Render a template into concrete workflow YAML for installation.
 *
 * The strict counterpart of `renderTemplate` (which stays lenient for the
 * read-only preview). Same raw-text mechanism — the `template-metadata` block
 * is stripped via its AST source range and the body's comments / indentation
 * are preserved byte-for-byte — but with install-grade guarantees:
 *
 *  1. Resolved values (submitted values, falling back to form `default`s) are
 *     validated against the declared `install.form` — throws
 *     `InstallFormValidationError` with field-level details.
 *  2. A body reference to an undeclared `__install__.<name>` throws
 *     `MissingInstallFormFieldError`; a reference to a declared field that has
 *     no resolved value throws `InstallFormValidationError`. Never the
 *     preview's `<name>` fallback.
 *  3. Substitution is YAML-safe: a placeholder that spans a whole scalar is
 *     re-emitted as a properly encoded YAML scalar (numbers / booleans bare,
 *     strings quoted when bare emission would change meaning); placeholders
 *     inside longer strings are interpolated and the scalar re-encoded.
 *     Placeholders in YAML comments are left untouched.
 */
export declare function renderInstall({ template, values }: RenderInstallInput): RenderInstallResult;
