/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { IndexPatternSpec, useKibana } from '../shared_imports';
import { IndexPatternEditorFlyoutContent } from './index_pattern_editor_flyout_content';
import { IndexPatternEditorContext, IndexPatternEditorProps } from '../types';

const IndexPatternFlyoutContentContainer = ({
  onSave,
  onCancel = () => {},
  defaultTypeIsRollup,
  requireTimestampField = false,
}: IndexPatternEditorProps) => {
  const {
    services: { indexPatternService, notifications },
  } = useKibana<IndexPatternEditorContext>();

  const onSaveClick = async (indexPatternSpec: IndexPatternSpec) => {
    try {
      const indexPattern = await indexPatternService.createAndSave(indexPatternSpec);

      const message = i18n.translate('indexPatternEditor.saved', {
        defaultMessage: "Saved '{indexPatternTitle}'",
        values: { indexPatternTitle: indexPattern.title },
      });
      notifications.toasts.addSuccess(message);
      await onSave(indexPattern);
    } catch (e) {
      const title = i18n.translate('indexPatternEditor.indexPatterns.unableSaveLabel', {
        defaultMessage: 'Failed to save index pattern.',
      });

      notifications.toasts.addDanger({ title });
    }
  };

  return (
    <IndexPatternEditorFlyoutContent
      onSave={onSaveClick}
      onCancel={onCancel}
      defaultTypeIsRollup={defaultTypeIsRollup}
      requireTimestampField={requireTimestampField}
    />
  );
};

/* eslint-disable import/no-default-export */
export default IndexPatternFlyoutContentContainer;
