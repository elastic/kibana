/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiMarkdownEditor, EuiMarkdownEditorProps, EuiMarkdownFormat } from '@elastic/eui';
import React, { useState } from 'react';

export type MarkdownProps = Partial<
  Omit<EuiMarkdownEditorProps, 'editorId' | 'uiPlugins' | 'markdownFormatProps'>
> & {
  /**
   * @param readOnly is needed to differentiate where markdown is used as a presentation of error messages
   * This was previous the MarkdownSimple component
   */
  readOnly: boolean;
  /** @link src/plugins/vis_type_markdown/public/markdown_vis_controller.tsx */
  openLinksInNewTab?: boolean;
  markdownContent?: string;
  ariaLabelContent?: string;
  /** Eui allows the height of the markdown component to be set */
  height?: number | 'full';
  placeholder?: string | undefined;
};

export const Markdown = ({
  ariaLabelContent,
  readOnly,
  openLinksInNewTab,
  markdownContent,
  placeholder = '',
  height = 'full',
}: MarkdownProps) => {
  const [value, setValue] = useState(placeholder);

  if (readOnly && markdownContent) {
    return (
      <EuiMarkdownFormat aria-label={ariaLabelContent ?? 'markdown component'}>
        {markdownContent}
      </EuiMarkdownFormat>
    );
  }

  return (
    <EuiMarkdownEditor
      readOnly={readOnly}
      aria-label={ariaLabelContent ?? 'markdown component'}
      placeholder={placeholder}
      value={value}
      onChange={setValue}
      height={height}
    />
  );
};
