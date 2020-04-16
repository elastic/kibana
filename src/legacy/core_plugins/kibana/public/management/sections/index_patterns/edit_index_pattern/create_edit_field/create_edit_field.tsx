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
import React, { useEffect } from 'react';
// @ts-ignore
import { FieldEditor } from 'ui/field_editor';

import { i18n } from '@kbn/i18n';
import { IndexHeader } from '../index_header';
import { IndexPattern, IndexPatternField } from '../../../../../../../../../plugins/data/public';

interface CreateEditFieldProps {
  indexPattern: IndexPattern;
  mode?: string;
  fieldName?: string;
  fieldFormatEditors: any;
  getConfig: () => any;
  servises: {
    addWarning: Function;
    http: Function;
    docTitle: Record<string, any>;
  };
}

export function CreateEditField({
  indexPattern,
  mode,
  fieldName,
  fieldFormatEditors,
  getConfig,
  servises,
}: CreateEditFieldProps) {
  const field: IndexPatternField | undefined =
    mode === 'edit' && fieldName
      ? indexPattern.fields.getByName(fieldName)
      : new IndexPatternField(indexPattern, {
          scripted: true,
          type: 'number',
        });

  useEffect(() => {
    if (mode === 'edit') {
      if (!field) {
        const message = i18n.translate('kbn.management.editIndexPattern.scripted.noFieldLabel', {
          defaultMessage:
            "'{indexPatternTitle}' index pattern doesn't have a scripted field called '{fieldName}'",
          values: { indexPatternTitle: indexPattern.title, fieldName },
        });
        servises.addWarning(message);
        window.history.pushState({}, '', `/management/kibana/index_patterns/${indexPattern.id}`);
      }
    }

    const docFieldName =
      field?.name ||
      i18n.translate('kbn.management.editIndexPattern.scripted.newFieldPlaceholder', {
        defaultMessage: 'New Scripted Field',
      });
    servises.docTitle.change([docFieldName, indexPattern.title]);
  }, [field, fieldName, indexPattern, mode, servises]);

  const redirectAway = () => {
    setTimeout(() => {
      window.history.pushState(
        {},
        '',
        `/management/kibana/index_patterns/${indexPattern.id}?_a=(tab:${
          field?.scripted ? 'scriptedFields' : 'indexedFields'
        })`
      );
    });
  };

  return (
    <>
      <IndexHeader indexPattern={indexPattern} />
      <FieldEditor
        indexPattern={indexPattern}
        field={field}
        helpers={{
          getConfig,
          $http: servises.http,
          fieldFormatEditors,
          redirectAway,
        }}
      />
    </>
  );
}
