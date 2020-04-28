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
// @ts-ignore
import { FieldEditor } from 'ui/field_editor';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HttpStart, DocLinksStart } from 'src/core/public';
import { IndexHeader } from '../index_header';
import { IndexPattern, IndexPatternField } from '../../../../../../../../../plugins/data/public';
import { ChromeDocTitle, NotificationsStart } from '../../../../../../../../../core/public';
import { TAB_SCRIPTED_FIELDS, TAB_INDEXED_FIELDS } from '../constants';

interface CreateEditFieldProps extends RouteComponentProps {
  indexPattern: IndexPattern;
  mode?: string;
  fieldName?: string;
  fieldFormatEditors: any;
  getConfig: (name: string) => any;
  services: {
    notifications: NotificationsStart;
    docTitle: ChromeDocTitle;
    getHttpStart: () => HttpStart;
    docLinksScriptedFields: DocLinksStart['links']['scriptedFields'];
  };
}

const newFieldPlaceholder = i18n.translate(
  'kbn.management.editIndexPattern.scripted.newFieldPlaceholder',
  {
    defaultMessage: 'New Scripted Field',
  }
);

export const CreateEditField = withRouter(
  ({
    indexPattern,
    mode,
    fieldName,
    fieldFormatEditors,
    getConfig,
    services,
    history,
  }: CreateEditFieldProps) => {
    const field =
      mode === 'edit' && fieldName
        ? indexPattern.fields.getByName(fieldName)
        : new IndexPatternField(indexPattern, {
            scripted: true,
            type: 'number',
          });

    const url = `/management/kibana/index_patterns/${indexPattern.id}`;

    if (mode === 'edit' && !field) {
      const message = i18n.translate('kbn.management.editIndexPattern.scripted.noFieldLabel', {
        defaultMessage:
          "'{indexPatternTitle}' index pattern doesn't have a scripted field called '{fieldName}'",
        values: { indexPatternTitle: indexPattern.title, fieldName },
      });
      services.notifications.toasts.addWarning(message);
      history.push(url);
    }

    const docFieldName = field?.name || newFieldPlaceholder;

    services.docTitle.change([docFieldName, indexPattern.title]);

    const redirectAway = () => {
      history.push(`${url}?_a=(tab:${field?.scripted ? TAB_SCRIPTED_FIELDS : TAB_INDEXED_FIELDS})`);
    };

    if (field) {
      return (
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <IndexHeader indexPattern={indexPattern} defaultIndex={getConfig('defaultIndex')} />
          </EuiFlexItem>
          <EuiFlexItem>
            <FieldEditor
              indexPattern={indexPattern}
              field={field}
              helpers={{
                getConfig,
                getHttpStart: services.getHttpStart,
                fieldFormatEditors,
                redirectAway,
                docLinksScriptedFields: services.docLinksScriptedFields,
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    } else {
      return <></>;
    }
  }
);
