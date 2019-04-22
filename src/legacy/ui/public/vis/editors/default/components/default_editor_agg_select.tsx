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

import { EuiComboBox, EuiFormRow, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AggType } from 'ui/agg_types';
import { AggConfig } from 'ui/vis/agg_config';
import { documentationLinks } from '../../../../documentation_links/documentation_links';
import { ComboBoxGroupedOption } from '../default_editor_utils';

interface DefaultEditorAggSelectProps {
  agg: AggConfig;
  aggTypeOptions: AggType[];
  isSelectInvalid: boolean;
  isSubAggregation: boolean;
  value: AggType;
  setValidity: (isValid: boolean) => void;
  setValue: (aggType: AggType) => void;
  setTouched: () => void;
}

function DefaultEditorAggSelect({
  agg,
  value,
  setValue,
  aggTypeOptions,
  isSelectInvalid,
  isSubAggregation,
  setTouched,
  setValidity,
}: DefaultEditorAggSelectProps) {
  const selectedOptions: ComboBoxGroupedOption[] = value ? [{ label: value.title, value }] : [];

  const label = isSubAggregation ? (
    <FormattedMessage
      id="common.ui.vis.defaultEditor.aggSelect.subAggregationLabel"
      defaultMessage="Sub aggregation"
    />
  ) : (
    <FormattedMessage
      id="common.ui.vis.defaultEditor.aggSelect.aggregationLabel"
      defaultMessage="Aggregation"
    />
  );

  let aggHelpLink = null;
  if (has(agg, 'type.name')) {
    aggHelpLink = get(documentationLinks, ['aggs', agg.type.name]);
  }

  const helpLink = value && aggHelpLink && (
    <EuiLink
      href={aggHelpLink}
      target="_blank"
      rel="noopener"
      className="visEditorAggSelect__helpLink"
    >
      <FormattedMessage
        id="common.ui.vis.defaultEditor.aggSelect.helpLinkLabel"
        defaultMessage="{aggTitle} help"
        values={{ aggTitle: value ? value.title : '' }}
      />
    </EuiLink>
  );

  const errors = [];

  if (!aggTypeOptions.length) {
    errors.push(
      i18n.translate('common.ui.vis.defaultEditor.aggSelect.noCompatibleAggsDescription', {
        defaultMessage: 'The index pattern {indexPatternTitle} does not contain any aggregations.',
        values: {
          indexPatternTitle: agg.getIndexPattern && agg.getIndexPattern().title,
        },
      })
    );
    setTouched();
  }

  useEffect(
    () => {
      // The selector will be invalid when the value is empty.
      setValidity(!!value);
    },
    [value]
  );

  return (
    <EuiFormRow
      label={label}
      labelAppend={helpLink}
      error={errors}
      isInvalid={isSelectInvalid}
      fullWidth={true}
      className="visEditorAggSelect__formRow"
    >
      <EuiComboBox
        placeholder={i18n.translate('common.ui.vis.defaultEditor.aggSelect.selectAggPlaceholder', {
          defaultMessage: 'Select an aggregation',
        })}
        id={`visDefaultEditorAggSelect${agg.id}`}
        isDisabled={!aggTypeOptions.length}
        options={aggTypeOptions}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
        onBlur={setTouched}
        onChange={options => setValue(get(options, '0.value'))}
        data-test-subj="defaultEditorAggSelect"
        isClearable={false}
        isInvalid={isSelectInvalid}
        fullWidth={true}
      />
    </EuiFormRow>
  );
}

export { DefaultEditorAggSelect };
