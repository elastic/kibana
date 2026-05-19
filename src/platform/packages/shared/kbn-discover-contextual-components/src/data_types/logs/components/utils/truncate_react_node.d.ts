import { type ReactNode } from 'react';
/**
 * Truncates text content with "..." inserted in the middle, preserving React element structure
 * (e.g., search highlight <mark> tags) when possible.
 *
 * @param node The React node to truncate
 * @param maxLength Maximum length before truncation
 * @param text The plain text representation of the node, used for length check and truncation
 */
export declare function truncateReactNode(node: ReactNode, maxLength: number, text: string): ReactNode;
