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

import { EuiComboBox, EuiComboBoxOptionProps, EuiFormRow, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { get } from 'lodash';
import React from 'react';
import { AggType } from 'ui/agg_types';
import { AggConfig } from 'ui/vis/agg_config';

interface DefaultEditorAggSelectProps {
  agg: AggConfig;
  aggHelpLink: string;
  aggTypeOptions: AggType[];
  isSubAggregation: boolean;
  isSelectValid: () => boolean;
  onChangeAggType: (agg: AggConfig, aggType: AggType) => void;
}

type ComboBoxGroupedOption = EuiComboBoxOptionProps & {
  label: string;
  options?: EuiComboBoxOptionProps[];
};

function DefaultEditorAggSelect({
  // since it happens that during 'agg_params' test run, this component is invoked with undefined props,
  // we added default value for agg and aggTypeOptions. It can be removed after 'agg_params' is converted to React
  agg = {},
  aggTypeOptions = [],
  aggHelpLink,
  isSelectValid,
  isSubAggregation,
  onChangeAggType,
}: DefaultEditorAggSelectProps) {
  const selectedOptions = agg.type ? [{ label: agg.type.title, value: agg.type }] : [];
  const labelNode = (
    <div>
      {isSubAggregation ? (
        <FormattedMessage
          id="common.ui.vis.defaultEditor.aggSelect.subAggregationLabel"
          defaultMessage="Sub aggregation"
        />
      ) : (
        <FormattedMessage
          id="common.ui.vis.defaultEditor.aggSelect.aggregationLabel"
          defaultMessage="Aggregation"
        />
      )}
      {aggHelpLink && (
        <EuiLink
          href={aggHelpLink}
          target="_blank"
          rel="noopener"
          className="visEditorAggSelect__helpLink pull-right"
          type="button"
        >
          <FormattedMessage
            id="common.ui.vis.defaultEditor.aggSelect.helpLinkLabel"
            defaultMessage="{aggTitle} help"
            values={{ aggTitle: agg.type && agg.type.title }}
          />
        </EuiLink>
      )}
    </div>
  );

  const onChange = (options: ComboBoxGroupedOption[]) => {
    onChangeAggType(agg, get(options, '0.value'));
  };

  return (
    <EuiFormRow label={labelNode} className="form-group">
      <EuiComboBox
        placeholder={i18n.translate('common.ui.vis.defaultEditor.aggSelect.selectAggPlaceholder', {
          defaultMessage: 'Select an aggregation',
        })}
        id={`visDefaultEditorAggSelect${agg.id}`}
        options={aggTypeOptions}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
        onChange={onChange}
        data-test-subj="defaultEditorAggSelect"
        isClearable={false}
        isInvalid={isSelectValid && !isSelectValid()}
      />
    </EuiFormRow>
  );
}

export { DefaultEditorAggSelect };
