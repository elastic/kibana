import React from 'react';
/**
 * Return a memoized markdown rendering function that use the specified
 * whiteListedRules and openLinksInNewTab configurations.
 * @param {Array of Strings} whiteListedRules - white list of markdown rules
 * list of rules can be found at https://github.com/markdown-it/markdown-it/issues/361
 * @param {Boolean} openLinksInNewTab
 * @return {Function} Returns an Object to use with dangerouslySetInnerHTML
 * with the rendered markdown HTML
 */
export declare const markdownFactory: ((whiteListedRules?: string[], openLinksInNewTab?: boolean) => (markdown: string) => string) & import("lodash").MemoizedFunction;
export interface MarkdownProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
    markdown?: string;
    openLinksInNewTab?: boolean;
    whiteListedRules?: string[];
    onRender?: () => void;
    isReversed?: boolean;
}
export declare const Markdown: (props: MarkdownProps) => React.JSX.Element;
export default Markdown;
