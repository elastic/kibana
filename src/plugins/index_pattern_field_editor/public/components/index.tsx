/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useState } from 'react';
import { OverlayStart, IUiSettingsClient } from 'src/core/public';
import { EuiButton, EuiFieldText } from '@elastic/eui';
import type { DocLinksStart } from 'src/core/public';
import { IndexPattern, IndexPatternField, DataPublicPluginStart } from '../../../data/public';
import { createKibanaReactContext, toMountPoint } from '../../../kibana_react/public';
// import { FieldFormatEditor } from './field_format_editor';

export const indexPatternFieldEditorFlyoutContent = (
  docLinks: DocLinksStart,
  uiSettings: IUiSettingsClient
) => (
  openFlyout: OverlayStart['openFlyout'],
  indexPattern: IndexPattern,
  indexPatternsService: DataPublicPluginStart['indexPatterns'],
  refreshFields: () => void,
  indexPatternField?: IndexPatternField
) => {
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({ uiSettings });
  const flyout = openFlyout(
    toMountPoint(
      <KibanaReactContextProvider>
        <Content
          indexPattern={indexPattern}
          indexPatternField={indexPatternField}
          docLinks={docLinks}
          onSave={async () => {
            await indexPatternsService.updateSavedObject(indexPattern);
            refreshFields();
            flyout.close();
          }}
        />
      </KibanaReactContextProvider>
    )
  );
};

const Content = ({
  indexPatternField,
  indexPattern,
  onSave,
  docLinks,
}: {
  indexPatternField?: IndexPatternField;
  indexPattern: IndexPattern;
  onSave: () => void;
  docLinks: DocLinksStart;
}) => {
  const isNewField = !!indexPatternField?.name;
  let getrf: any;
  const [fieldName, setFieldName] = useState<string>(indexPatternField?.name || '');

  return (
    <>
      <div>Name</div>
      <EuiFieldText
        readOnly={isNewField}
        defaultValue={fieldName}
        onChange={(e) => {
          setFieldName(e.target.value);
        }}
      />
      <hr />
      {/**
      <FieldFormatEditor
        fieldType={indexPatternField?.type || 'keyword'}
        fieldFormat={indexPattern.getFormatterForField(indexPatternField)}
        fieldFormatId="number"
        fieldFormatParams={{}}
        fieldFormatEditors={formatEditors}
        onChange={() => {}}
        onError={() => {}}
      />
      */}
      <EuiButton
        disabled={!fieldName}
        onClick={async () => {
          const field = indexPattern.getFieldByName(fieldName);
          const {
            data: { script, type },
          } = await getrf();
          if (!field) {
            indexPattern.addRuntimeField(fieldName, {
              type,
              script,
            });
          } else {
            field.runtimeField = {
              type,
              script,
            };
          }
          onSave();
        }}
      >
        {!!isNewField ? 'Save field' : 'Create new field'}
      </EuiButton>
    </>
  );
};
