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

import { i18n } from '@kbn/i18n';
import { IFieldType } from '../../../../../../plugins/data/public';

export function extractTimeFields(fields: IFieldType[]) {
  const dateFields = fields.filter((field) => field.type === 'date');
  const label = i18n.translate(
    'indexPatternManagement.createIndexPattern.stepTime.noTimeFieldsLabel',
    {
      defaultMessage: "The indices which match this index pattern don't contain any time fields.",
    }
  );

  if (dateFields.length === 0) {
    return [
      {
        display: label,
      },
    ];
  }

  const disabledDividerOption = {
    isDisabled: true,
    display: '───',
    fieldName: '',
  };
  const noTimeFieldLabel = i18n.translate(
    'indexPatternManagement.createIndexPattern.stepTime.noTimeFieldOptionLabel',
    {
      defaultMessage: "I don't want to use the Time Filter",
    }
  );
  const noTimeFieldOption = {
    display: noTimeFieldLabel,
    fieldName: undefined,
  };

  return [
    ...dateFields.map((field) => ({
      display: field.name,
      fieldName: field.name,
    })),
    disabledDividerOption,
    noTimeFieldOption,
  ];
}
