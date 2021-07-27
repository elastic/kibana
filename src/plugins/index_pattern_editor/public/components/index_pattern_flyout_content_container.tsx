/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { IndexPattern, IndexPatternSpec, useKibana } from '../shared_imports';
import { IndexPatternEditorFlyoutContent } from './index_pattern_editor_flyout_content';
import { IndexPatternEditorContext } from '../types';

export interface IndexPatternFlyoutContentContainerProps {
  /**
   * Handler for the "save" footer button
   */
  onSave: (indexPattern: IndexPattern) => void;
  /**
   * Handler for the "cancel" footer button
   */
  onCancel: () => void;
  defaultTypeIsRollup?: boolean;
  requireTimestampField?: boolean;
}

/**
 * The container component will be in charge of the communication with the index pattern service
 * to retrieve/save the field in the saved object.
 * The <FieldEditorFlyoutContent /> component is the presentational component that won't know
 * anything about where a field comes from and where it should be persisted.
 */

export const IndexPatternFlyoutContentContainer = ({
  onSave,
  onCancel,
  defaultTypeIsRollup,
  requireTimestampField = false,
}: IndexPatternFlyoutContentContainerProps) => {
  const {
    services: { indexPatternService, notifications },
  } = useKibana<IndexPatternEditorContext>();

  const onSaveClick = async (indexPatternSpec: IndexPatternSpec) => {
    const indexPattern = await indexPatternService.createAndSave(indexPatternSpec);
    const message = i18n.translate('indexPatternEditor.saved', {
      defaultMessage: "Saved '{indexPatternTitle}'",
      values: { indexPatternTitle: indexPattern.title },
    });
    notifications.toasts.addSuccess(message);
    await onSave(indexPattern);
  };

  const [existingIndexPatterns, setExistingIndexPatterns] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const getTitles = async () => {
      const indexPatternTitles = await indexPatternService.getTitles();
      if (isMounted) {
        setExistingIndexPatterns(indexPatternTitles);
      }
    };
    getTitles();
    return () => {
      isMounted = false;
    };
  }, [indexPatternService]);

  return (
    <IndexPatternEditorFlyoutContent
      onSave={onSaveClick}
      onCancel={onCancel}
      existingIndexPatterns={existingIndexPatterns}
      defaultTypeIsRollup={defaultTypeIsRollup}
      requireTimestampField={requireTimestampField}
    />
  );
};
