import React from 'react';
export interface ErrorCalloutProps {
    title: string;
    error: Error;
    isEsqlMode?: boolean;
    /** When set, renders the "View details" action (non-ES|QL mode only). */
    showErrorDialog?: (args: {
        title: string;
        error: Error;
    }) => void;
    /** Doc link for the ES|QL reference button. Used when `isEsqlMode` is true. */
    esqlReferenceHref?: string;
}
export declare const ErrorCallout: ({ title, error, isEsqlMode, showErrorDialog, esqlReferenceHref, }: ErrorCalloutProps) => React.JSX.Element;
