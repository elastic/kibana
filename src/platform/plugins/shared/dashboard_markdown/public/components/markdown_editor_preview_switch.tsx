/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonGroupOptionProps, UseEuiTheme } from '@elastic/eui';
import { EuiButtonGroup, htmlIdGenerator } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import React from 'react';

const generateId = htmlIdGenerator();
const EDITOR_ID = generateId('markdown_editor__editor');
const PREVIEW_ID = generateId('markdown_editor__preview');

const editorPreviewOptions: EuiButtonGroupOptionProps[] = [
  {
    id: EDITOR_ID,
    'data-test-subj': 'markdownEditorEditor',
    label: i18n.translate('dashboardMarkdown.editor', {
      defaultMessage: 'Editor',
    }),
  },
  {
    id: PREVIEW_ID,
    'data-test-subj': 'markdownEditorPreview',
    label: i18n.translate('dashboardMarkdown.preview', {
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
  isEditing$,
  onSwitch,
}: {
  isPreview$: PublishingSubject<boolean>;
  isEditing$: PublishingSubject<boolean>;
  onSwitch: (isPreview: boolean) => void;
}) => {
  const [isPreview, isEditing] = useBatchedPublishingSubjects(isPreview$, isEditing$);
  const styles = useMemoCss(switchStyles);
  if (!isEditing) {
    return null;
  }
  return (
    <EuiButtonGroup
      legend={i18n.translate('dashboardMarkdown.editorPreviewSwitch', {
        defaultMessage: 'Editor/Preview switch',
      })}
      options={editorPreviewOptions}
      idSelected={isPreview ? PREVIEW_ID : EDITOR_ID}
      onChange={(id) => {
        onSwitch(id === PREVIEW_ID);
      }}
      buttonSize="compressed"
      type="single"
      css={styles.buttonGroup}
    />
  );
};
