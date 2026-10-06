import type { ReactNode } from 'react';
/**
 * Formats an array value as React nodes with bracket/comma notation.
 *
 * Single-element and empty arrays are passed through without brackets.
 *
 * This should be applied at the call site (e.g. inside convertToReact)
 * rather than inside individual formatter's reactConvert, so that formatters which
 * override reactConvert get correct array rendering for free.
 */
export declare function formatReactArray(val: unknown[], convertSingle: (v: unknown) => ReactNode): ReactNode;
