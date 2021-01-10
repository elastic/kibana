/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState } from 'react';
import { OverlayStart, IUiSettingsClient } from 'src/core/public';
import { EuiButton, EuiFieldText } from '@elastic/eui';
import type { DocLinksStart } from 'src/core/public';
import { IndexPattern, IndexPatternField, DataPublicPluginStart } from '../../../data/public';
import { createKibanaReactContext, toMountPoint } from '../../../kibana_react/public';
import type { RuntimeField } from '../types';

// eslint-disable-next-line
import type { RuntimeFieldStart } from '../../../../../x-pack/plugins/runtime_field_editor/public';

export const indexPatternFieldEditorFlyoutContent = (
  docLinks: DocLinksStart,
  uiSettings: IUiSettingsClient,
  RuntimeFields?: RuntimeFieldStart['RuntimeFieldEditor']
) => (
  openFlyout: OverlayStart['openFlyout'],
  indexPattern: IndexPattern,
  indexPatternsService: DataPublicPluginStart['indexPatterns'],
  indexPatternField?: IndexPatternField
) => {
  console.log('flyout setup', RuntimeFields);
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({ uiSettings });
  openFlyout(
    toMountPoint(
      <KibanaReactContextProvider>
        <Content
          indexPattern={indexPattern}
          indexPatternField={indexPatternField}
          RuntimeFields={RuntimeFields}
          docLinks={docLinks}
          onSave={() => {
            console.log('onSave');
            indexPatternsService.updateSavedObject(indexPattern);
            console.log(indexPattern);
          }}
        />
      </KibanaReactContextProvider>
    )
  );
  console.log(
    'hello from async loaded component',
    indexPattern,
    indexPatternField,
    indexPatternField?.isMapped
  );
};

const Content = ({
  indexPatternField,
  indexPattern,
  onSave,
  RuntimeFields,
  docLinks,
}: {
  indexPatternField?: IndexPatternField;
  indexPattern: IndexPattern;
  onSave: () => void;
  RuntimeFields?: RuntimeFieldStart['RuntimeFieldEditor'];
  docLinks: DocLinksStart;
}) => {
  const [fieldName, setFieldName] = useState<string>('');
  const [runtimeField, setRuntimeField] = useState<RuntimeField>();
  const runtimeContent = RuntimeFields && (
    <RuntimeFields
      defaultValue={runtimeField}
      onChange={(rf) => {
        // setRuntimeField(rf)}
        console.log('onChange', rf);
      }}
      docLinks={docLinks}
    />
  );

  console.log('RuntimeFields', RuntimeFields, runtimeContent);

  return (
    <>
      <div>hello {indexPatternField?.name}</div>
      <EuiFieldText value={fieldName} onChange={(e) => setFieldName(e.target.value)} />
      {runtimeContent}
      <EuiButton
        onClick={() => {
          const field = indexPattern.getFieldByName(fieldName);
          if (!field) {
            indexPattern.saveRuntimeField(fieldName, {
              name: fieldName,
              type: 'keyword',
              script: { source: `emit('${fieldName}')` },
            });
            onSave();
          }
        }}
      >
        Add new field
      </EuiButton>
    </>
  );
};
