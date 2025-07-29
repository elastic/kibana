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
import React, { useLayoutEffect, useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FOOTER_HELP_TEXT, MarkdownFooter } from './markdown_footer';
import { MarkdownRenderer } from './markdown_renderer';

interface EuiMarkdownEditorRef {
  textarea: HTMLTextAreaElement;
  replaceNode: any;
}

const componentStyles = {
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
      '.euiMarkdownEditorDropZone': {
        minBlockSize: 'initial',
      },
      textarea: {
        minBlockSize: 'initial',
      },
      width: '100%',
      blockSize: `calc(100% - ${euiTheme.size.xxl})`,
      '.euiMarkdownEditorFooter': {
        // todo: remove this https://github.com/elastic/eui/pull/8889
        display: 'none',
      },
      '[data-test-subj="markdown_editor_preview_button"]': {
        display: 'none',
      },
    }),
};

const strings = {
  placeholder: i18n.translate('dashboardMarkdown.placeholder', {
    defaultMessage: 'Use Markdown to format your text',
  }),
  ariaLabel: i18n.translate('dashboardMarkdown.embeddableAriaLabel', {
    defaultMessage: 'Dashboard markdown editor',
  }),
};

export function useCaretPosition(
  ref: React.RefObject<{ textarea?: HTMLTextAreaElement | null }>,
  shouldFocus: boolean
) {
  const caretPosRef = useRef<number | null>(null);

  // Keep caretPosRef updated
  useLayoutEffect(() => {
    const textarea = ref.current?.textarea;
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
  }, [ref.current?.textarea, ref]);

  // Restore caret when needed (preview -> editor)
  useLayoutEffect(() => {
    if (!shouldFocus) return;

    const textarea = ref.current?.textarea;
    if (!textarea) return;

    textarea.focus();

    if (caretPosRef.current === null) {
      // focus at end of first line
      const newlineIndex = textarea.value.indexOf('\n');
      const firstLineEnd = newlineIndex === -1 ? textarea.value.length : newlineIndex;
      textarea.setSelectionRange(firstLineEnd, firstLineEnd);
    } else {
      textarea.setSelectionRange(caretPosRef.current, caretPosRef.current);
    }
  }, [shouldFocus, ref.current?.textarea, ref]);

  return caretPosRef;
}

export interface MarkdownEditorProps {
  processingPluginList: EuiMarkdownFormatProps['processingPluginList'];
  content: string;
  onCancel: () => void;
  onSave: (value: string) => void;
  isPreview$: BehaviorSubject<boolean>;
}

export const MarkdownEditor = ({
  processingPluginList,
  content,
  onCancel,
  onSave,
  isPreview$,
}: MarkdownEditorProps) => {
  const styles = useMemoCss(componentStyles);
  const isPreview = useStateFromPublishingSubject(isPreview$);
  const [value, onChange] = React.useState(content ?? '');

  const editorRef = useRef<EuiMarkdownEditorRef>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useCaretPosition(editorRef, !isPreview);
  const isSaveable = Boolean(value === '' || value !== content);

  return (
    <>
      <div
        css={[styles.container, isPreview && styles.componentInvisible]}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            cancelButtonRef.current?.focus();
          }
        }}
      >
        <EuiMarkdownEditor
          value={value}
          onChange={onChange}
          aria-label={strings.ariaLabel}
          placeholder={strings.placeholder}
          processingPluginList={processingPluginList}
          height="full"
          ref={editorRef}
          css={styles.editorStyles}
          aria-describedby={FOOTER_HELP_TEXT}
        />
      </div>
      {isPreview && (
        <MarkdownRenderer processingPluginList={processingPluginList} content={value ?? ''} />
      )}
      <MarkdownFooter
        onCancel={onCancel}
        onSave={() => onSave(value)}
        isPreview={isPreview}
        cancelButtonRef={cancelButtonRef}
        isSaveable={isSaveable}
      />
    </>
  );
};
