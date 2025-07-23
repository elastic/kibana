/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonGroup, EuiButtonGroupOptionProps, UseEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { usePublishingSubject } from '@kbn/presentation-publishing';
import React from 'react';
import { BehaviorSubject } from 'rxjs';

const EDITOR_ID = 'markdown_editor__editor';
const PREVIEW_ID = 'markdown_editor__preview';

const editorPreviewOptions: EuiButtonGroupOptionProps[] = [
  {
    id: EDITOR_ID,
    label: i18n.translate('embeddableExamples.euiMarkdownEditor.editor', {
      defaultMessage: 'Editor',
    }),
  },
  {
    id: PREVIEW_ID,
    label: i18n.translate('embeddableExamples.euiMarkdownEditor.preview', {
      defaultMessage: 'Preview',
    }),
  },
];

const switchStyles = {
  buttonGroup: ({ euiTheme }: UseEuiTheme) => ({
    background: 'none',
    padding: 0,
    marginBottom: euiTheme.size.xs,
    '*': {
      border: 'none !important',
    },
    button: {
      marginBottom: 0,
      marginTop: 0,
    },
  }),
};

export const MarkdownEditorPreviewSwitch = ({
  isPreview$,
}: {
  isPreview$: BehaviorSubject<boolean>;
}) => {
  const isPreview = usePublishingSubject(isPreview$);
  const styles = useMemoCss(switchStyles);
  return (
    <EuiButtonGroup
      legend={i18n.translate('embeddableExamples.euiMarkdownEditor.editorPreviewSwitch', {
        defaultMessage: 'Editor/Preview switch',
      })}
      options={editorPreviewOptions}
      idSelected={isPreview ? PREVIEW_ID : EDITOR_ID}
      onChange={(id) => {
        isPreview$.next(id === PREVIEW_ID);
      }}
      buttonSize="compressed"
      type="single"
      css={styles.buttonGroup}
    />
  );
};
