/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiTable, EuiTableBody } from '@elastic/eui';

import { ResultField } from './result_field';
import { ResultFieldProps } from './result_types';

interface Props {
  fields: ResultFieldProps[];
  isExpanded: boolean;
}

export const ResultFields: React.FC<Props> = ({ fields, isExpanded }) => {
  return (
    <EuiTable>
      <EuiTableBody>
        {fields.map((field) => (
          <ResultField
            isExpanded={isExpanded}
            iconType={field.iconType}
            fieldName={field.fieldName}
            fieldValue={field.fieldValue}
            fieldType={field.fieldType}
            key={field.fieldName}
          />
        ))}
      </EuiTableBody>
    </EuiTable>
  );
};
