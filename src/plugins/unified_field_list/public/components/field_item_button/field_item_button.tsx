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
import { type FieldListItem, type GetCustomFieldType } from '../../types';
import { wrapFieldNameOnDot } from '../../utils/wrap_field_name_on_dot';
import { FieldIcon, getFieldIconProps } from '../field_icon';

export interface FieldItemButtonProps<T extends FieldListItem> {
  field: T;
  fieldSearchHighlight?: string;
  isActive?: FieldButtonProps['isActive'];
  className?: FieldButtonProps['className'];
  getCustomFieldType?: GetCustomFieldType<T>;
  onClick: FieldButtonProps['onClick'];
}

export function FieldItemButton<T extends FieldListItem = DataViewField>({
  field,
  fieldSearchHighlight,
  isActive,
  className,
  getCustomFieldType,
  onClick,
  ...otherProps
}: FieldItemButtonProps<T>) {
  const displayName = field.displayName || field.name;

  return (
    <FieldButton
      className={className}
      isActive={isActive}
      onClick={onClick}
      buttonProps={{
        ['aria-label']: i18n.translate('unifiedFieldList.fieldItemButtonAriaLabel', {
          defaultMessage: 'Preview {fieldName}: {fieldType}',
          values: {
            fieldName: displayName,
            fieldType: getCustomFieldType ? getCustomFieldType(field) : field.type,
          },
        }),
      }}
      fieldIcon={
        getCustomFieldType ? (
          <FieldIcon type={getCustomFieldType(field)} />
        ) : (
          <FieldIcon {...getFieldIconProps(field)} />
        )
      }
      fieldName={
        <EuiHighlight search={wrapFieldNameOnDot(fieldSearchHighlight)}>
          {wrapFieldNameOnDot(displayName)}
        </EuiHighlight>
      }
      {...otherProps}
    />
  );
}
