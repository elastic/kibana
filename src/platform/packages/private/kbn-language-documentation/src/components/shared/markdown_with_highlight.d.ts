import React from 'react';
/**
 * Markdown component, with a plugin that supports highlighting text wrapped in double equals tokens
 */
export declare const MarkdownWithHighlight: React.MemoExoticComponent<({ markdownContent, openLinksInNewTab, }: {
    markdownContent: string;
    openLinksInNewTab?: boolean;
}) => React.JSX.Element>;
