/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { DocLinksStart, NotificationsStart, CoreStart } from 'src/core/public';
import { i18n } from '@kbn/i18n';

import { IndexPattern, DataPublicPluginStart, IndexPatternSpec } from '../shared_imports';
// import { PluginStart, InternalFieldType } from '../types';
// import { deserializeField, getRuntimeFieldValidator } from '../lib';
// import { Props as FieldEditorProps } from './field_editor/field_editor';
import { IndexPatternEditorFlyoutContent } from './index_pattern_editor_flyout_content';

export interface Props {
  /**
   * Handler for the "save" footer button
   */
  onSave: (indexPattern: IndexPattern) => void;
  /**
   * Handler for the "cancel" footer button
   */
  onCancel: () => void;
  /**
   * The docLinks start service from core
   */
  docLinks: DocLinksStart;
  /**
   * The context object specific to where the editor is currently being consumed
   */
  // ctx: FieldEditorContext;
  /**
   * Optional field to edit
   */
  // field?: IndexPatternField;
  /**
   * Services
   */
  indexPatternService: DataPublicPluginStart['indexPatterns'];
  notifications: NotificationsStart;
  // fieldFormatEditors: PluginStart['fieldFormatEditors'];
  // fieldFormats: DataPublicPluginStart['fieldFormats'];
  // uiSettings: CoreStart['uiSettings'];
  http: CoreStart['http'];
  navigateToApp: CoreStart['application']['navigateToApp'];
  canCreateIndexPattern: boolean;
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
  docLinks,
  indexPatternService,
  notifications,
  http,
  navigateToApp,
  canCreateIndexPattern,
}: Props) => {
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
    const getTitles = async () => {
      const indexPatternTitles = await indexPatternService.getTitles();
      setExistingIndexPatterns(indexPatternTitles);
    };
    getTitles();
  }, [indexPatternService]);

  return (
    <IndexPatternEditorFlyoutContent
      onSave={onSaveClick}
      onCancel={onCancel}
      docLinks={docLinks}
      isSaving={false}
      existingIndexPatterns={existingIndexPatterns}
      http={http}
      indexPatternService={indexPatternService}
      navigateToApp={navigateToApp}
      canCreateIndexPattern={canCreateIndexPattern}
    />
  );
};
