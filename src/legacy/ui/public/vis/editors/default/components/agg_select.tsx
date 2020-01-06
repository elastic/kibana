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

import { EuiComboBox, EuiComboBoxOptionProps, EuiFormRow, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AggType } from 'ui/agg_types';
import { documentationLinks } from '../../../../documentation_links/documentation_links';
import { ComboBoxGroupedOptions } from '../utils';
import { IndexPattern } from '../../../../../../../plugins/data/public';

interface DefaultEditorAggSelectProps {
  aggError?: string;
  aggTypeOptions: ComboBoxGroupedOptions<AggType>;
  id: string;
  indexPattern: IndexPattern;
  showValidation: boolean;
  isSubAggregation: boolean;
  value: AggType;
  setValidity: (isValid: boolean) => void;
  setValue: (aggType: AggType) => void;
  setTouched: () => void;
}

function DefaultEditorAggSelect({
  aggError,
  id,
  indexPattern,
  value,
  setValue,
  aggTypeOptions,
  showValidation,
  isSubAggregation,
  setTouched,
  setValidity,
}: DefaultEditorAggSelectProps) {
  const selectedOptions: ComboBoxGroupedOptions<AggType> = value
    ? [{ label: value.title, target: value }]
    : [];

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

  let aggHelpLink: string | undefined;
  if (has(value, 'name')) {
    aggHelpLink = get(documentationLinks, ['aggs', value.name]);
  }

  const helpLink = value && aggHelpLink && (
    <EuiLink href={aggHelpLink} target="_blank" rel="noopener">
      <EuiText size="xs">
        <FormattedMessage
          id="common.ui.vis.defaultEditor.aggSelect.helpLinkLabel"
          defaultMessage="{aggTitle} help"
          values={{ aggTitle: value ? value.title : '' }}
        />
      </EuiText>
    </EuiLink>
  );

  const errors = aggError ? [aggError] : [];

  if (!aggTypeOptions.length) {
    errors.push(
      i18n.translate('common.ui.vis.defaultEditor.aggSelect.noCompatibleAggsDescription', {
        defaultMessage:
          'The index pattern {indexPatternTitle} does not have any aggregatable fields.',
        values: {
          indexPatternTitle: indexPattern && indexPattern.title,
        },
      })
    );
  }

  const isValid = !!value && !errors.length;

  useEffect(() => {
    setValidity(isValid);
  }, [isValid]);

  useEffect(() => {
    if (errors.length) {
      setTouched();
    }
  }, [errors.length]);

  const onChange = (options: EuiComboBoxOptionProps[]) => {
    const selectedOption = get(options, '0.target');
    if (selectedOption) {
      setValue(selectedOption as AggType);
    }
  };

  return (
    <EuiFormRow
      label={label}
      labelAppend={helpLink}
      error={errors}
      isInvalid={showValidation ? !isValid : false}
      fullWidth={true}
      compressed
    >
      <EuiComboBox
        placeholder={i18n.translate('common.ui.vis.defaultEditor.aggSelect.selectAggPlaceholder', {
          defaultMessage: 'Select an aggregation',
        })}
        id={`visDefaultEditorAggSelect${id}`}
        isDisabled={!aggTypeOptions.length}
        options={aggTypeOptions}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
        onBlur={setTouched}
        onChange={onChange}
        data-test-subj="defaultEditorAggSelect"
        isClearable={false}
        isInvalid={showValidation ? !isValid : false}
        fullWidth={true}
        compressed
      />
    </EuiFormRow>
  );
}

export { DefaultEditorAggSelect };
