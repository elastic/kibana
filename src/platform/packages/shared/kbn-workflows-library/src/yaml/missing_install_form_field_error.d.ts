/**
 * The template body references `__install__.<name>` fields that its
 * `install.form` does not declare. This is an authoring bug in the template:
 * the form is the single source of truth for install-time inputs, so
 * installing must fail rather than silently substituting a placeholder.
 */
export declare class MissingInstallFormFieldError extends Error {
    readonly fields: string[];
    constructor(fields: string[]);
}
