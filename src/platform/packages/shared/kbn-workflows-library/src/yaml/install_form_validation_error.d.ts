/** A single field-level install-form validation failure. */
export interface InstallFormFieldError {
    /** The `install.form` field name (`InstallFormField['name']`). */
    field: string;
    /** Human-readable reason the value was rejected. */
    reason: string;
}
/**
 * Submitted install-form values failed validation against the template's
 * declared `install.form`. Carries field-level details so the API can return
 * a 400 with per-field errors and the UI can highlight the offending rows.
 */
export declare class InstallFormValidationError extends Error {
    readonly errors: InstallFormFieldError[];
    constructor(errors: InstallFormFieldError[]);
}
