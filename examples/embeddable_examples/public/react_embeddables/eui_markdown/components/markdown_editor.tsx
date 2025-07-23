/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiMarkdownEditor, EuiMarkdownFormatProps, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import React, { useEffect, useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { MarkdownFooter } from './markdown_footer';
import { MarkdownRenderer } from './markdown_renderer';

const markdownStyles = {
  container: css({
    width: '100%',
  }),
  componentInvisible: css({
    opacity: 0,
    pointerEvents: 'none',
    userSelect: 'none',
    position: 'absolute',
  }),
  editorStyles: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '100%',
      blockSize: `calc(100% - ${euiTheme.size.xxl})`,
      '.euiMarkdownEditorFooter': {
        // todo: remove this after merging the eui changes
        display: 'none',
      },
      '[data-test-subj="markdown_editor_preview_button"]': {
        display: 'none',
      },
    }),
};

const dashboardMarkdownEditorAriaLabel = () =>
  i18n.translate('embeddableExamples.euiMarkdownEditor.embeddableAriaLabel', {
    defaultMessage: 'Dashboard markdown editor',
  });



export const MarkdownEditor = ({
  processingPluginList,
  content,
  onCancel,
  onSave,
  isPreview$,
}: {
  processingPluginList: EuiMarkdownFormatProps['processingPluginList'];
  content: string;
  onCancel: () => void;
  onSave: (value: string) => void;
  isPreview$: BehaviorSubject<boolean>;
}) => {
  const styles = useMemoCss(markdownStyles);

  const isPreview = useStateFromPublishingSubject(isPreview$);
  const [value, onChange] = React.useState(content ?? '');

  const editorRef = useRef(null);
  const caretPosRef = useRef<number | null>(null);

  useEffect(() => {
    const textarea = editorRef.current?.textarea;
    if (!textarea) return;

    const updateCaret = () => {
      caretPosRef.current = textarea.selectionStart;
    };

    textarea.addEventListener('input', updateCaret);
    textarea.addEventListener('click', updateCaret);
    textarea.addEventListener('keyup', updateCaret);

    return () => {
      textarea.removeEventListener('input', updateCaret);
      textarea.removeEventListener('click', updateCaret);
      textarea.removeEventListener('keyup', updateCaret);
    };
  }, []);

  useEffect(() => {
    if (isPreview) {
      return;
    }
    if (editorRef.current) {
      const textarea = editorRef.current.textarea;
      if (!textarea) {
        return;
      }
      textarea.focus();

      if (caretPosRef.current === null) {
        // Find index of first newline
        const newlineIndex = textarea.value.indexOf('\n');
        const firstLineEnd = newlineIndex === -1 ? textarea.value.length : newlineIndex;
        textarea.setSelectionRange(firstLineEnd, firstLineEnd);
      } else {
        textarea.setSelectionRange(caretPosRef.current, caretPosRef.current);
      }
    }
  }, [isPreview]);

  return (
    <>
      <div css={[styles.container, isPreview && styles.componentInvisible]}>
        <EuiMarkdownEditor
          ref={editorRef}
          css={styles.editorStyles}
          toolbarProps={{
            right: <div>TODO</div>,
          }}
          value={value}
          onChange={(v) => onChange(v)}
          aria-label={dashboardMarkdownEditorAriaLabel}
          processingPluginList={processingPluginList}
          height="full"
          showFooter="false"
        />
      </div>
      {isPreview && (
        <MarkdownRenderer
          processingPluginList={processingPluginList}
          content={value ?? content ?? ''}
        />
      )}
      <MarkdownFooter onCancel={onCancel} onSave={() => onSave(value)} isPreview={isPreview} />
    </>
  );
};
