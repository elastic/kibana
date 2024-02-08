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
  getDefaultEuiMarkdownPlugins,
} from '@elastic/eui';
import React, { useState } from 'react';

export type MarkdownProps = Partial<
  Omit<EuiMarkdownEditorProps, 'editorId' | 'uiPlugins' | 'markdownFormatProps'>
> & {
  /**
   * @param readOnly is needed to differentiate where markdown is used as a presentation of error messages
   * This was previous the MarkdownSimple component, it's default value is false
   */
  readOnly?: boolean;
  enableTooltipSupport?: boolean;
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
  openLinksInNewTab = true,
  defaultValue = '',
  placeholder = '',
  height = 'full',
  readOnly = false,
  enableTooltipSupport = false,
  ...restProps
}: MarkdownProps) => {
  const [value, setValue] = useState(defaultValue);

  const { parsingPlugins, processingPlugins, uiPlugins } = getDefaultEuiMarkdownPlugins({
    exclude: enableTooltipSupport ? undefined : ['tooltip'],
  });

  // openLinksInNewTab functionality from https://codesandbox.io/s/relaxed-yalow-hy69r4?file=/demo.js:482-645
  processingPlugins[1][1].components.a = (props) => <EuiLink {...props} target="_blank" />;

  // Render EuiMarkdownFormat when readOnly set to true
  if (readOnly) {
    if (!children && !markdownContent) {
      throw new Error('Markdown content is required in [readOnly] mode');
    }
    return (
      <EuiMarkdownFormat
        className={className}
        aria-label={ariaLabelContent ?? 'markdown component'}
        parsingPluginList={parsingPlugins}
        processingPluginList={openLinksInNewTab ? processingPlugins : undefined}
        data-test-subj={restProps['data-test-subj']}
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
      parsingPluginList={parsingPlugins}
      processingPluginList={openLinksInNewTab ? processingPlugins : undefined}
      data-test-subj={restProps['data-test-subj']}
    />
  );
};
