/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldTypeKnown } from '@kbn/field-utils';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { FieldListItem, GetCustomFieldType } from '../../../types';

interface FieldTypeFilterProps<T extends FieldListItem> {
  'data-test-subj': string;
  docLinks: CoreStart['docLinks'];
  allFields: T[] | null;
  getCustomFieldType?: GetCustomFieldType<T>;
  selectedFieldTypes: FieldTypeKnown[];
  onSupportedFieldFilter?: (field: T) => boolean;
  onChange: (fieldTypes: FieldTypeKnown[]) => unknown;
}

export function FieldTypeFilter<T extends FieldListItem = DataViewField>({
  'data-test-subj': dataTestSubject,
  selectedFieldTypes,
  onChange,
}: FieldTypeFilterProps<T>) {
  const toggleTypeFilter = () => {
    if (selectedFieldTypes.includes('number')) {
      onChange(selectedFieldTypes.filter((type) => type !== 'number'));
      return;
    }
    onChange([...selectedFieldTypes, 'number']);
  };

  return (
    <>
      <EuiButtonEmpty
        size="xs"
        data-test-subj={`${dataTestSubject}FieldTypeFilterToggle`}
        onClick={() => {}}
      >
        Type filter
      </EuiButtonEmpty>
      <EuiButtonEmpty size="xs" data-test-subj="typeFilter-number" onClick={toggleTypeFilter}>
        Number
      </EuiButtonEmpty>
    </>
  );
}
