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
import { get, has } from 'lodash';
import React, { useEffect } from 'react';

import { EuiFlexGroup, EuiFormErrorText, EuiForm } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AggType } from 'ui/agg_types';
import { AggConfig } from 'ui/vis/agg_config';
import { DefaultEditorAggSelect } from './default_editor_agg_select';
import { aggTypeFilters } from '../../../../agg_types/filter';
import { aggTypes } from '../../../../agg_types';
import { groupAggregationsBy } from '../default_editor_utils';

interface DefaultEditorAggParamsProps {
  id: string;
  agg: AggConfig;
  aggIndex: number;
  aggIsTooLow: boolean;
  vis: any;
  groupName: string;
  indexPattern: any;
  showValidation: boolean;
  onAggTypeChange: (agg: AggConfig, aggType: AggType) => void;
  setTouched: () => void;
  setValidity: (isValid: boolean) => void;
}

function DefaultEditorAggParams({
  agg,
  aggIndex,
  aggIsTooLow,
  groupName,
  indexPattern,
  showValidation = false,
  onAggTypeChange,
  setTouched,
  setValidity,
}: DefaultEditorAggParamsProps) {
  const aggTypeOptions = aggTypeFilters.filter(aggTypes.byType[groupName], indexPattern, agg);
  const groupedAggTypeOptions = groupAggregationsBy(aggTypeOptions, 'subtype');
  const isSubAggregation = aggIndex >= 1 && groupName === 'buckets';

  const errors = [];
  if (aggIsTooLow) {
    errors.push(
      i18n.translate('common.ui.vis.editors.aggParams.errors.aggWrongRunOrderErrorMessage', {
        defaultMessage: '"{schema}" aggs must run before all other buckets!',
        values: { schema: agg.schema.title },
      })
    );
  }
  if (agg.error) {
    errors.push(agg.error);
  }
  if (agg.schema.deprecate) {
    errors.push(
      agg.schema.deprecateMessage
        ? agg.schema.deprecateMessage
        : i18n.translate('common.ui.vis.editors.aggParams.errors.schemaIsDeprecatedErrorMessage', {
            defaultMessage: '"{schema}" has been deprecated.',
            values: { schema: agg.schema.title },
          })
    );
  }

  return (
    <EuiForm isInvalid={!!errors.length} error={errors}>
      {/* {SchemaEditorComponent && <SchemaEditorComponent />}*/}
      <DefaultEditorAggSelect
        agg={agg}
        value={agg.type}
        aggTypeOptions={groupedAggTypeOptions}
        showValidation={showValidation}
        isSubAggregation={isSubAggregation}
        setValue={value => onAggTypeChange(agg, value)}
        setTouched={setTouched}
        setValidity={setValidity}
      />

      {/* {params.basic.map((param: any) => (
        <VisEditorAggParam editor={param.editor} agg={agg} {...param.attrs} />
      ))}

      {params.advanced && (
        <EuiAccordion
          id="advancedAccordion"
          buttonContent={i18n.translate('common.ui.vis.editors.advancedToggle.advancedLinkLabel', {
            defaultMessage: 'Advanced',
          })}
          paddingSize="l"
        >
          {params.advanced.map((param: any) => (
            <VisEditorAggParam editor={param.editor} agg={agg} {...param.attrs} />
          ))}
        </EuiAccordion>
      )} */}
    </EuiForm>
  );
}

export { DefaultEditorAggParams };
