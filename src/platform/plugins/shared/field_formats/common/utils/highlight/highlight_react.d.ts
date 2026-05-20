import React from 'react';
/**
 * Applies search highlighting to a field value, returning React nodes.
 *
 * Step 1: for each highlight, strip its Kibana tags to get the plain substring,
 * then replace every occurrence of that substring in the working string with
 * the tagged version. React automatically escapes text node content.
 *
 * Step 2: convert the tag-substituted string to React nodes, wrapping each
 * highlighted span in a <mark> element.
 */
export declare function getHighlightReact(fieldValue: string, highlights: string[] | undefined | null): React.ReactNode;
