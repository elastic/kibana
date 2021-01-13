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
// import type { RuntimeField } from '../types';

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
          RuntimeFields={RuntimeFields}
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
  RuntimeFields,
  docLinks,
}: {
  indexPatternField?: IndexPatternField;
  indexPattern: IndexPattern;
  onSave: () => void;
  RuntimeFields?: RuntimeFieldStart['RuntimeFieldEditor'];
  docLinks: DocLinksStart;
}) => {
  const isNewField = !!indexPatternField?.name;
  let getrf: any;
  const [fieldName, setFieldName] = useState<string>(indexPatternField?.name || '');
  // const [getRuntimeField, setGetRuntimeField] = useState<any>();
  const runtimeContent = RuntimeFields && (
    <RuntimeFields
      defaultValue={
        indexPatternField?.runtimeField && {
          name: indexPatternField?.name,
          ...indexPatternField?.runtimeField,
        }
      }
      onChange={async (rf) => {
        // console.log('a', a++);
        getrf = rf.submit;
      }}
      docLinks={docLinks}
    />
  );

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
      {runtimeContent}
      <EuiButton
        disabled={!fieldName}
        onClick={async () => {
          const field = indexPattern.getFieldByName(fieldName);
          const {
            data: { script, type },
          } = await getrf();
          if (!field) {
            indexPattern.saveRuntimeField(fieldName, {
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
