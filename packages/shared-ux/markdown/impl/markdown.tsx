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
  getDefaultEuiMarkdownProcessingPlugins,
} from '@elastic/eui';
import React, { useState } from 'react';

export type MarkdownProps = Partial<
  Omit<EuiMarkdownEditorProps, 'editorId' | 'uiPlugins' | 'markdownFormatProps'>
> & {
  /**
   * @param readOnly is needed to differentiate where markdown is used as a presentation of error messages
   * This was previous the MarkdownSimple component
   */
  readOnly: boolean;
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
  readOnly,
  markdownContent,
  children,
  openLinksInNewTab = true,
  defaultValue = '',
  placeholder = '',
  height = 'full',
}: MarkdownProps) => {
  const [value, setValue] = useState(defaultValue);

  // openLinksInNewTab functionality from https://codesandbox.io/s/relaxed-yalow-hy69r4?file=/demo.js:482-645
  const processingPlugins = getDefaultEuiMarkdownProcessingPlugins();
  processingPlugins[1][1].components.a = (props) => <EuiLink {...props} target="_blank" />;

  // Render EuiMarkdownFormat when readOnly set to true
  if (readOnly) {
    if (!children && !markdownContent) {
      throw new Error('Markdown content is required in [readOnly] mode');
    }
    return (
      <EuiMarkdownFormat
        aria-label={ariaLabelContent ?? 'markdown component'}
        processingPluginList={openLinksInNewTab ? processingPlugins : undefined}
      >
        {children ?? markdownContent!}
      </EuiMarkdownFormat>
    );
  }

  // Otherwise render the Markdown Editor if readOnly false
  return (
    <EuiMarkdownEditor
      aria-label={ariaLabelContent ?? 'markdown component'}
      placeholder={placeholder}
      value={value}
      onChange={setValue}
      height={height}
      processingPluginList={openLinksInNewTab ? processingPlugins : undefined}
    />
  );
};
