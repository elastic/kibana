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
import React, { useEffect, useCallback, useState } from 'react';

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { IAggType, IndexPattern } from 'src/plugins/data/public';
import { useKibana } from '../../../kibana_react/public';
import { ComboBoxGroupedOptions } from '../utils';
import { AGG_TYPE_ACTION_KEYS, AggTypeAction } from './agg_params_state';

interface DefaultEditorAggSelectProps {
  aggError?: string;
  aggTypeOptions: ComboBoxGroupedOptions<IAggType>;
  id: string;
  indexPattern: IndexPattern;
  showValidation: boolean;
  isSubAggregation: boolean;
  value: IAggType;
  onChangeAggType: React.Dispatch<AggTypeAction>;
  setValue: (aggType: IAggType) => void;
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
  onChangeAggType,
}: DefaultEditorAggSelectProps) {
  const [isDirty, setIsDirty] = useState(false);
  const { services } = useKibana();
  const selectedOptions: ComboBoxGroupedOptions<IAggType> = value
    ? [{ label: value.title, target: value }]
    : [];

  const label = isSubAggregation ? (
    <FormattedMessage
      id="visDefaultEditor.aggSelect.subAggregationLabel"
      defaultMessage="Sub aggregation"
    />
  ) : (
    <FormattedMessage
      id="visDefaultEditor.aggSelect.aggregationLabel"
      defaultMessage="Aggregation"
    />
  );

  let aggHelpLink: string | undefined;
  if (has(value, 'name')) {
    aggHelpLink = services.docLinks.links.aggs[value.name];
  }

  const helpLink = value && aggHelpLink && (
    <EuiLink href={aggHelpLink} target="_blank" rel="noopener">
      <EuiText size="xs">
        <FormattedMessage
          id="visDefaultEditor.aggSelect.helpLinkLabel"
          defaultMessage="{aggTitle} help"
          values={{ aggTitle: value ? value.title : '' }}
        />
      </EuiText>
    </EuiLink>
  );

  const errors = aggError ? [aggError] : [];

  if (!aggTypeOptions.length) {
    errors.push(
      i18n.translate('visDefaultEditor.aggSelect.noCompatibleAggsDescription', {
        defaultMessage:
          'The index pattern {indexPatternTitle} does not have any aggregatable fields.',
        values: {
          indexPatternTitle: indexPattern && indexPattern.title,
        },
      })
    );
  }

  const isValid = !!value && !errors.length && !isDirty;

  const onChange = useCallback(
    (options: EuiComboBoxOptionOption[]) => {
      const selectedOption = get(options, '0.target');
      if (selectedOption) {
        setValue(selectedOption as IAggType);
      }
    },
    [setValue]
  );
  const onSearchChange = useCallback((searchValue) => setIsDirty(Boolean(searchValue)), []);

  const setTouched = useCallback(
    () => onChangeAggType({ type: AGG_TYPE_ACTION_KEYS.TOUCHED, payload: true }),
    [onChangeAggType]
  );
  const setValidity = useCallback(
    (valid) => onChangeAggType({ type: AGG_TYPE_ACTION_KEYS.VALID, payload: valid }),
    [onChangeAggType]
  );

  useEffect(() => {
    setValidity(isValid);
  }, [isValid, setValidity]);

  useEffect(() => {
    if (errors.length) {
      setTouched();
    }
  }, [errors.length, setTouched]);

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
        placeholder={i18n.translate('visDefaultEditor.aggSelect.selectAggPlaceholder', {
          defaultMessage: 'Select an aggregation',
        })}
        id={`visDefaultEditorAggSelect${id}`}
        isDisabled={!aggTypeOptions.length}
        options={aggTypeOptions}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
        onBlur={setTouched}
        onChange={onChange}
        onSearchChange={onSearchChange}
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
