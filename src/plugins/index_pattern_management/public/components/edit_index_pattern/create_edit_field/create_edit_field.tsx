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
import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IndexPattern, IndexPatternField } from '../../../../../../plugins/data/public';
import { useKibana } from '../../../../../../plugins/kibana_react/public';
import { IndexPatternManagmentContext } from '../../../types';
import { IndexHeader } from '../index_header';
import { TAB_SCRIPTED_FIELDS, TAB_INDEXED_FIELDS } from '../constants';

import { FieldEditor } from '../../field_editor';

interface CreateEditFieldProps extends RouteComponentProps {
  indexPattern: IndexPattern;
  mode?: string;
  fieldName?: string;
}

const newFieldPlaceholder = i18n.translate(
  'indexPatternManagement.editIndexPattern.scripted.newFieldPlaceholder',
  {
    defaultMessage: 'New Scripted Field',
  }
);

export const CreateEditField = withRouter(
  ({ indexPattern, mode, fieldName, history }: CreateEditFieldProps) => {
    const { uiSettings, chrome, notifications, data } = useKibana<
      IndexPatternManagmentContext
    >().services;
    const spec =
      mode === 'edit' && fieldName
        ? indexPattern.fields.getByName(fieldName)?.spec
        : (({
            scripted: true,
            type: 'number',
            name: undefined,
          } as unknown) as IndexPatternField);

    const url = `/patterns/${indexPattern.id}`;

    if (mode === 'edit' && !spec) {
      const message = i18n.translate(
        'indexPatternManagement.editIndexPattern.scripted.noFieldLabel',
        {
          defaultMessage:
            "'{indexPatternTitle}' index pattern doesn't have a scripted field called '{fieldName}'",
          values: { indexPatternTitle: indexPattern.title, fieldName },
        }
      );
      notifications.toasts.addWarning(message);
      history.push(url);
    }

    const docFieldName = spec?.name || newFieldPlaceholder;

    chrome.docTitle.change([docFieldName, indexPattern.title]);

    const redirectAway = () => {
      history.push(
        `${url}#/?_a=(tab:${spec?.scripted ? TAB_SCRIPTED_FIELDS : TAB_INDEXED_FIELDS})`
      );
    };

    if (spec) {
      return (
        <EuiPanel paddingSize={'l'}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <IndexHeader
                indexPattern={indexPattern}
                defaultIndex={uiSettings.get('defaultIndex')}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <FieldEditor
                indexPattern={indexPattern}
                spec={spec}
                services={{
                  indexPatternService: data.indexPatterns,
                  redirectAway,
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      );
    } else {
      return <></>;
    }
  }
);
