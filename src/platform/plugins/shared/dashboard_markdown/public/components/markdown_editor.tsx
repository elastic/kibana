/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiMarkdownEditorProps, EuiMarkdownFormatProps, UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiMarkdownEditor,
  EuiMarkdownEditorHelpButton,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { SHORT_CONTAINER_QUERY, FOOTER_HELP_TEXT, MarkdownFooter } from './markdown_footer';
import { MarkdownRenderer } from './markdown_renderer';

interface EuiMarkdownEditorRef {
  textarea: HTMLTextAreaElement;
  replaceNode: any;
}

const componentStyles = {
  rootContainer: css({
    display: 'flex',
    width: '100%',
    containerType: 'size',
  }),
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
      blockSize: `calc(100% - ${euiTheme.size.xxl})`,
      width: '100%',
      '.euiMarkdownEditorDropZone': {
        minBlockSize: 'initial',
      },
      textarea: {
        minBlockSize: 'initial',
      },
      [SHORT_CONTAINER_QUERY]: {
        blockSize: `100%`,
        // TODO: Do not use data-test-subj to style - should be fixed in EUI
        '[data-test-subj="euiMarkdownEditorToolbar"]': {
          display: 'none',
        },
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
  settingsButtonLabel: i18n.translate('dashboardMarkdown.settingsButtonText', {
    defaultMessage: 'Settings',
  }),
};
export interface MarkdownEditorProps {
  parsingPluginList?: EuiMarkdownEditorProps['parsingPluginList'];
  processingPluginList: EuiMarkdownFormatProps['processingPluginList'];
  content: string;
  onCancel: () => void;
  onSave: (value: string) => Promise<void>;
  isPreview$: PublishingSubject<boolean>;
  /** Opens the flyout with the panel settings */
  onOpenSettings: () => void;
  uiPlugins?: EuiMarkdownEditorProps['uiPlugins'];
}

export const MarkdownEditor = ({
  parsingPluginList,
  processingPluginList,
  content,
  onCancel,
  onSave,
  isPreview$,
  onOpenSettings,
  uiPlugins = [],
}: MarkdownEditorProps) => {
  const styles = useMemoCss(componentStyles);
  const isPreview = useStateFromPublishingSubject(isPreview$);
  const [value, onChange] = useState(content);

  const editorRef = useRef<EuiMarkdownEditorRef>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useCaretPosition(editorRef, !isPreview);
  const isSaveable = Boolean(value === '' || value !== content);

  return (
    <div css={styles.rootContainer}>
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
          parsingPluginList={parsingPluginList}
          processingPluginList={processingPluginList}
          uiPlugins={uiPlugins}
          height="full"
          ref={editorRef}
          css={styles.editorStyles}
          aria-describedby={FOOTER_HELP_TEXT}
          showFooter={false}
          toolbarProps={{
            right: (
              <>
                <EuiToolTip
                  disableScreenReaderOutput
                  content={strings.settingsButtonLabel}
                  position="bottom"
                >
                  <EuiButtonIcon
                    iconType="gear"
                    color="text"
                    size="s"
                    aria-label={strings.settingsButtonLabel}
                    onClick={onOpenSettings}
                    data-test-subj="markdownEditorSettingsButton"
                  />
                </EuiToolTip>
                <EuiMarkdownEditorHelpButton
                  uiPlugins={uiPlugins}
                  tooltipProps={{ position: 'bottom' }}
                />
              </>
            ),
          }}
        />
      </div>
      {isPreview && (
        <MarkdownRenderer
          parsingPluginList={parsingPluginList}
          processingPluginList={processingPluginList}
          content={value}
        />
      )}
      <MarkdownFooter
        onCancel={onCancel}
        onSave={async () => await onSave(value)}
        isPreview={isPreview}
        cancelButtonRef={cancelButtonRef}
        isSaveable={isSaveable}
      />
    </div>
  );
};

function useCaretPosition(
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
