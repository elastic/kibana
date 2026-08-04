import React from 'react';
import type { InstallFormField } from '@kbn/workflows-library';
export interface InstallFormProps {
    fields: InstallFormField[];
    /** Current form values, keyed by field name. Owned by the parent. */
    values: Record<string, unknown>;
    /** Display-ready validation message per field name (the parent decides visibility). */
    errors: Record<string, string | undefined>;
    /** Fired on every input change (keystroke included for text inputs). */
    onChange: (name: string, value: unknown) => void;
    /**
     * Fired when a value is ready to be reflected elsewhere (touched tracking,
     * the live YAML preview): on change for discrete inputs (select, switch,
     * connector, number), on blur for free-text inputs.
     */
    onCommit: (name: string, value: unknown) => void;
}
/**
 * Renders a template's `install.form` fields. Purely presentational — the
 * parent owns values, validation, and touched state (so a future composition
 * flow can render several instances against one state).
 */
export declare const InstallForm: React.NamedExoticComponent<InstallFormProps>;
