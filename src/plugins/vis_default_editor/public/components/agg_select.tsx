/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, has } from 'lodash';
import React, { useEffect, useCallback, useState } from 'react';

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { IAggType, IndexPattern } from '@kbn/data-plugin/public';

import { DocLinksStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
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
  const { services } = useKibana<{ docLinks: DocLinksStart }>();
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
    // @ts-expect-error
    aggHelpLink = services.docLinks.links.aggs[value.name];
  }

  const helpLink = value && aggHelpLink && (
    <EuiText size="xs">
      <EuiLink href={aggHelpLink} target="_blank" rel="noopener">
        <FormattedMessage
          id="visDefaultEditor.aggSelect.helpLinkLabel"
          defaultMessage="{aggTitle} help"
          values={{ aggTitle: value ? value.title : '' }}
        />
      </EuiLink>
    </EuiText>
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
      display="rowCompressed"
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
        sortMatchesBy="startsWith"
        compressed
      />
    </EuiFormRow>
  );
}

export { DefaultEditorAggSelect };
