/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiLink,
  EuiMarkdownEditor,
  EuiMarkdownEditorProps,
  EuiMarkdownFormat,
  euiMarkdownLinkValidator,
  getDefaultEuiMarkdownPlugins,
} from '@elastic/eui';
import React, { useState } from 'react';
import { useEffect } from 'react';

export type MarkdownProps = Partial<
  Omit<EuiMarkdownEditorProps, 'editorId' | 'uiPlugins' | 'markdownFormatProps'>
> & {
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

export const Markdown = ({
  ariaLabelContent,
  markdownContent,
  children,
  className,
  onRender,
  openLinksInNewTab = true,
  defaultValue = '',
  placeholder = '',
  height = 'full',
  readOnly = false,
  enableTooltipSupport = false,
  validateLinks = false,
  ...restProps
}: MarkdownProps) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    // onRender will be called after each render to signal, that we are done with rendering.
    onRender?.();
  }, [onRender]);

  const { parsingPlugins, processingPlugins, uiPlugins } = getDefaultEuiMarkdownPlugins({
    exclude: enableTooltipSupport ? undefined : ['tooltip'],
  });

  // openLinksInNewTab functionality from https://codesandbox.io/s/relaxed-yalow-hy69r4?file=/demo.js:482-645
  processingPlugins[1][1].components.a = (props) => <EuiLink {...props} target="_blank" />;

  const _parsingPlugins = validateLinks
    ? parsingPlugins
    : // @ts-expect-error
      parsingPlugins.filter(([plugin]) => {
        return plugin !== euiMarkdownLinkValidator;
      });

  // Render EuiMarkdownFormat when readOnly set to true
  if (readOnly) {
    if (!children && !markdownContent) {
      throw new Error('Markdown content is required in [readOnly] mode');
    }
    return (
      <EuiMarkdownFormat
        textSize={'relative'}
        className={className}
        aria-label={ariaLabelContent ?? 'markdown component'}
        parsingPluginList={_parsingPlugins}
        processingPluginList={openLinksInNewTab ? processingPlugins : undefined}
        data-test-subj={restProps['data-test-subj']}
        // There was a trick to pass style as a part of props in the legacy React <Markdown> component
        style={restProps.style}
      >
        {children ?? markdownContent!}
      </EuiMarkdownFormat>
    );
  }

  // Otherwise render the Markdown Editor if readOnly false
  return (
    <EuiMarkdownEditor
      className={className}
      aria-label={ariaLabelContent ?? 'markdown component'}
      placeholder={placeholder}
      value={value}
      onChange={setValue}
      height={height}
      uiPlugins={uiPlugins}
      parsingPluginList={_parsingPlugins}
      processingPluginList={openLinksInNewTab ? processingPlugins : undefined}
      data-test-subj={restProps['data-test-subj']}
    />
  );
};
