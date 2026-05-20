import { type ReactNode } from 'react';
/**
 * Recursively extracts plain text content from a ReactNode without rendering it.
 * Handles strings, numbers, arrays, and React elements by traversing their children.
 */
export declare function extractTextFromReactNode(node: ReactNode): string;
