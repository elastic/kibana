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
import { KBN_FIELD_TYPES, esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import { typeToEuiIconMap } from '@kbn/react-field/src/field_icon/field_icon';
import React, { useCallback } from 'react';

export const FieldTypeSelector = ({
  selectedType,
  onTypeChange,
}: {
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
}) => {
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

  const selectedOption = OPTIONS.find((option) => option.value === selectedType) || null;

  return (
    <EuiComboBox
      compressed
      aria-label={i18n.translate('indexEditor.columnHeaderEdit.fieldTypeSelectAriaLabel', {
        defaultMessage: 'Field type select',
      })}
      placeholder={i18n.translate('indexEditor.columnHeaderEdit.selectATypePlaceholder', {
        defaultMessage: 'Select option',
      })}
      data-test-subj="indexEditorindexEditorColumnTypeSelect"
      onChange={handleChange}
      selectedOptions={selectedOption ? [selectedOption] : []}
      options={OPTIONS}
      singleSelection
      renderOption={renderOption}
      prepend={selectedType ? <FieldIcon type={selectedType} label={selectedType} /> : undefined}
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
      <EuiLink
        href="https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-types.html"
        target="_blank"
        external
      >
        {option.label}
      </EuiLink>
    );
  }

  let fieldType = option.value as string;
  if (!typeToEuiIconMap[option.value as keyof typeof typeToEuiIconMap]) {
    const kibanaFieldType = esFieldTypeToKibanaFieldType(fieldType);
    fieldType = kibanaFieldType === KBN_FIELD_TYPES.UNKNOWN ? fieldType : kibanaFieldType;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false}>
      <FieldIcon type={fieldType} label={option.label} />
      <span className={contentClassName}>
        <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
      </span>
    </EuiFlexGroup>
  );
};

const typeGroups: { label: string; types: string[] }[] = [
  {
    label: i18n.translate('field_select.group.text', {
      defaultMessage: 'Text',
    }),
    types: [
      'text',
      'keyword',
      'constant_keyword',
      'wildcard',
      'match_only_text',
      'search_as_you_type',
      'semantic_text',
    ],
  },
  {
    label: i18n.translate('field_select.group.numeric', {
      defaultMessage: 'Numeric',
    }),
    types: [
      'byte',
      'double',
      'float',
      'half_float',
      'integer',
      'long',
      'short',
      'unsigned_long',
      'histogram',
    ],
  },
  {
    label: i18n.translate('field_select.group.boolean_date', {
      defaultMessage: 'Boolean & Date',
    }),
    types: ['boolean', 'date', 'date_nanos'],
  },
  {
    label: i18n.translate('field_select.group.ip_geo', {
      defaultMessage: 'IP & Geo',
    }),
    types: ['ip', 'geo_point', 'geo_shape'],
  },
  {
    label: i18n.translate('field_select.group.structured', {
      defaultMessage: 'Structured',
    }),
    types: ['flattened'],
  },
  {
    label: i18n.translate('field_select.group.range', {
      defaultMessage: 'Range',
    }),
    types: ['integer_range', 'float_range', 'long_range', 'ip_range', 'double_range', 'date_range'],
  },
  {
    label: i18n.translate('field_select.group.advanced', {
      defaultMessage: 'Advanced',
    }),
    types: [
      'version',
      'rank_feature',
      'rank_features',
      'dense_vector',
      'sparse_vector',
      'binary',
      'percolator',
    ],
  },
  {
    label: i18n.translate('field_select.group.advanced', {
      defaultMessage: 'Will not work well',
    }),
    types: [
      'scaled_float',
      'aggregate_metric_double',
      'object',
      'nested',
      'murmur3',
      'token_count',
      'join',
    ],
  },
];

/**
 * Transforms field_name into Field name.
 */
const snakeCaseToReadableText = (type: string) =>
  type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');

const OPTIONS: EuiComboBoxOptionOption[] = typeGroups.flatMap((group) => [
  {
    isGroupLabelOption: true,
    label: group.label,
  },
  ...group.types.map((type) => ({
    value: type,
    label: snakeCaseToReadableText(type),
  })),
]);

const DOCUMENTATION_VALUE = 'documentation';
OPTIONS.push({
  value: DOCUMENTATION_VALUE,
  label: i18n.translate('indexEditor.columnHeaderEdit.documentationLink', {
    defaultMessage: 'Learn about field types',
  }),
});
