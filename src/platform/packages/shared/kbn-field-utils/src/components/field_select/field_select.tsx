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
import type { DocLinksStart } from '@kbn/core/public';
import { TYPE_GROUPS, getFieldIconType, getFieldLabel } from './utils';

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
  label: i18n.translate('fieldUtils.fieldTypeSelect.documentationLink', {
    defaultMessage: 'Learn about field types',
  }),
});

export interface FieldSelectProps {
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
  docLinks?: DocLinksStart;
}

/**
 * A ComboBox component for selecting field types.
 * Renders icons next to field types and groups them into categories.
 */
export const FieldSelect = ({
  selectedType,
  onTypeChange,
  docLinks,
  ...restOfProps
}: FieldSelectProps) => {
  const handleChange = useCallback(
    (selectedOptions: EuiComboBoxOptionOption[]) => {
      if (selectedOptions.length === 0) {
        onTypeChange(null);
        return;
      }
      const selected = selectedOptions[0];
      if (selected && selected.value !== DOCUMENTATION_VALUE) {
        onTypeChange(selected.value as string);
      }
    },
    [onTypeChange]
  );

  const selectedOption = useMemo(() => {
    const opt = OPTIONS.find((option) => option.value === selectedType);
    return opt ? [opt] : [];
  }, [selectedType]);

  const renderOption = useMemo(
    () => (option: EuiComboBoxOptionOption, searchValue: string, contentClassName: string) => {
      if (option.value === DOCUMENTATION_VALUE) {
        if (!docLinks) {
          return null;
        }
        return (
          <EuiLink href={docLinks.links.discover.fieldTypeHelp} target="_blank" external>
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
    },
    [docLinks]
  );

  return (
    <EuiComboBox
      compressed
      aria-label={i18n.translate('fieldUtils.fieldTypeSelect.ariaLabel', {
        defaultMessage: 'Field type select',
      })}
      placeholder={i18n.translate('fieldUtils.fieldTypeSelect.placeholder', {
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
      singleSelection={{ asPlainText: true }}
      {...restOfProps}
    />
  );
};
