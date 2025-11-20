/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFlexGroup, EuiHighlight, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import React, { useCallback, useMemo } from 'react';
import { TYPE_GROUPS, getFieldIconType, getFieldLabel } from './utils';

const ES_TYPES_DOCS_URL =
  'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-types.html';
const DOCUMENTATION_VALUE = 'documentation';

const OPTIONS: EuiComboBoxOptionOption[] = TYPE_GROUPS.flatMap((group) => [
  {
    isGroupLabelOption: true,
    label: group.label,
  },
  ...group.types.map((type) => ({
    value: type,
    label: getFieldLabel(type),
  })),
]).concat({
  value: DOCUMENTATION_VALUE,
  label: i18n.translate('fieldTypeSelect.documentationLink', {
    defaultMessage: 'Learn about field types',
  }),
});

export interface FieldSelectProps {
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
}

/**
 * A ComboBox component for selecting field types.
 * Renders icons next to field types and groups them into categories.
 */
export const FieldSelect = ({ selectedType, onTypeChange, ...restOfProps }: FieldSelectProps) => {
  const handleChange = useCallback(
    (selectedOptions: EuiComboBoxOptionOption[]) => {
      if (selectedOptions.length === 0) {
        onTypeChange(null);
        return;
      }
      const selected = selectedOptions[0];
      if (selected && selected.value !== 'documentation') {
        onTypeChange(selected.value as string);
      }
    },
    [onTypeChange]
  );

  const selectedOption = useMemo(() => {
    const opt = OPTIONS.find((option) => option.value === selectedType);
    return opt ? [opt] : [];
  }, [selectedType]);

  return (
    <EuiComboBox
      compressed
      aria-label={i18n.translate('fieldTypeSelect.ariaLabel', {
        defaultMessage: 'Field type select',
      })}
      placeholder={i18n.translate('fieldTypeSelect.placeholder', {
        defaultMessage: 'Select option',
      })}
      data-test-subj="fieldTypeSelect"
      onChange={handleChange}
      selectedOptions={selectedOption}
      options={OPTIONS}
      renderOption={renderOption}
      prepend={
        selectedType ? (
          <FieldIcon type={getFieldIconType(selectedType)} label={selectedType} />
        ) : undefined
      }
      singleSelection
      {...restOfProps}
    />
  );
};

const renderOption = (
  option: EuiComboBoxOptionOption,
  searchValue: string,
  contentClassName: string
) => {
  if (option.value === 'documentation') {
    return (
      <EuiLink href={ES_TYPES_DOCS_URL} target="_blank" external>
        {option.label}
      </EuiLink>
    );
  }

  const fieldType = getFieldIconType(option.value as string);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false}>
      <FieldIcon type={fieldType} label={option.label} />
      <span className={contentClassName}>
        <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
      </span>
    </EuiFlexGroup>
  );
};
