/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type KeyboardEvent } from 'react';
import { css } from '@emotion/react';
import { EuiMarkdownEditor, getDefaultEuiMarkdownUiPlugins, useEuiTheme } from '@elastic/eui';
import { COMMENT_MAX_LENGTH } from '../constants';

/** Height of the text, in px: a few lines. Below EUI's minimum, which the styles below lift. */
const TEXT_HEIGHT = 100;
/** How far the text can be dragged taller before the popover it is in runs out of room. */
const TEXT_MAX_HEIGHT = 250;

/** The tooltip plugin is left out: it edits in a modal, which the layer's popovers sit above. */
const uiPlugins = getDefaultEuiMarkdownUiPlugins({ exclude: ['tooltip'] });

/** Marks the rendered preview, for the styles below to find the box it is in. */
const PREVIEW_CLASS = 'devCommentsEditorPreview';

export interface CommentEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Cmd/Ctrl+Enter, from anywhere in the editor. */
  onSubmit: () => void;
  readOnly?: boolean;
  placeholder: string;
  'aria-label': string;
  'data-test-subj'?: string;
}

/**
 * Markdown editor for comments and replies, sized for the layer's popovers:
 * a few lines of text, the toolbar wrapping to the width available, no footer.
 * The preview renders the text the way the comment will be shown.
 */
export const CommentEditor = ({
  value,
  onChange,
  onSubmit,
  readOnly = false,
  placeholder,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
}: CommentEditorProps) => {
  const { euiTheme } = useEuiTheme();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <EuiMarkdownEditor
      value={value}
      onChange={(next) => onChange(next.slice(0, COMMENT_MAX_LENGTH))}
      onKeyDown={onKeyDown}
      height={TEXT_HEIGHT}
      maxHeight={TEXT_MAX_HEIGHT}
      showFooter={false}
      uiPlugins={uiPlugins}
      readOnly={readOnly}
      placeholder={placeholder}
      aria-label={ariaLabel}
      markdownFormatProps={{ className: PREVIEW_CLASS }}
      css={css`
        /* EUI keeps the text, the box around it and the preview at least 150px tall; the popovers
           have less room. Named by what they are, not by EUI's class names: the editor's one
           textarea, the box it is in, and the box the preview (marked above) is in. */
        textarea,
        div:has(> textarea),
        div:has(> .${PREVIEW_CLASS}) {
          min-block-size: ${TEXT_HEIGHT}px;
        }
        /* Without the footer, the text closes the box. */
        textarea {
          border-bottom: ${euiTheme.border.thin};
          border-radius: 0 0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium};
        }
      `}
      data-test-subj={dataTestSubj}
    />
  );
};
