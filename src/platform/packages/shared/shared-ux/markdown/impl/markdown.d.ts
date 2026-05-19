import type { EuiMarkdownEditorProps } from '@elastic/eui';
import React from 'react';
export type MarkdownProps = Partial<Omit<EuiMarkdownEditorProps, 'editorId' | 'uiPlugins' | 'markdownFormatProps'>> & {
    /**
     * @param readOnly is needed to differentiate where markdown is used as a presentation of error messages
     * This was previous the MarkdownSimple component, it's default value is false
     */
    readOnly?: boolean;
    enableTooltipSupport?: boolean;
    /**
     * allow opt in to default EUI link validation behavior, see {@link https://eui.elastic.co/#/editors-syntax/markdown-plugins#link-validation-security}
     */
    validateLinks?: boolean;
    /**
     * enables regular line breaks to be rendered in HTML without `<br />` tags, see {@link https://github.github.com/gfm/#soft-line-breaks}
     */
    enableSoftLineBreaks?: boolean;
    /**
     * provides a way to signal to a parent component that the component rendered successfully
     */
    onRender?: () => void;
    defaultValue?: string;
    markdownContent?: string;
    ariaLabelContent?: string;
    /** Eui allows the height of the markdown component to be set */
    height?: number | 'full';
    placeholder?: string | undefined;
    children?: string;
    openLinksInNewTab?: boolean;
};
export declare const Markdown: ({ ariaLabelContent, markdownContent, children, className, onRender, openLinksInNewTab, defaultValue, placeholder, height, readOnly, enableTooltipSupport, validateLinks, enableSoftLineBreaks, ...restProps }: MarkdownProps) => React.JSX.Element;
