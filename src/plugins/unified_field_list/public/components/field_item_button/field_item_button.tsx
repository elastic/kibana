/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FieldButton, type FieldButtonProps } from '@kbn/react-field';
import { EuiHighlight } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { FieldListItem } from '../../types';
import { wrapFieldNameOnDot } from '../../utils/wrap_field_name_on_dot';
import { FieldIcon, getFieldIconProps } from '../field_icon';

export interface FieldItemButtonProps<T extends FieldListItem> {
  field: T;
  fieldSearchHighlight?: string;
  isActive?: FieldButtonProps['isActive'];
  className?: FieldButtonProps['className'];
  fieldInfoIcon?: FieldButtonProps['fieldInfoIcon'];
  onClick: FieldButtonProps['onClick'];
}

export function FieldItemButton<T extends FieldListItem = DataViewField>({
  field,
  fieldSearchHighlight,
  isActive,
  className,
  fieldInfoIcon,
  onClick,
}: FieldItemButtonProps<T>) {
  return (
    <FieldButton
      className={className}
      isActive={isActive}
      onClick={onClick}
      buttonProps={{
        ['aria-label']: i18n.translate('unifiedFieldList.fieldItemButtonAriaLabel', {
          defaultMessage: 'Preview {fieldName}: {fieldType}',
          values: {
            fieldName: field.displayName,
            fieldType: field.type,
          },
        }),
      }}
      fieldIcon={<FieldIcon {...getFieldIconProps(field)} />}
      fieldName={
        <EuiHighlight search={wrapFieldNameOnDot(fieldSearchHighlight)}>
          {wrapFieldNameOnDot(field.displayName)}
        </EuiHighlight>
      }
      fieldInfoIcon={fieldInfoIcon}
    />
  );
}
