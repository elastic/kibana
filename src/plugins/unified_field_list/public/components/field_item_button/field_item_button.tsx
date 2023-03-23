/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import classnames from 'classnames';
import { FieldButton, type FieldButtonProps } from '@kbn/react-field';
import { EuiHighlight } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { type FieldListItem, type GetCustomFieldType } from '../../types';
import { FieldIcon, getFieldIconProps } from '../field_icon';
import './field_item_button.scss';

/**
 * Props of FieldItemButton component
 */
export interface FieldItemButtonProps<T extends FieldListItem> {
  field: T;
  fieldSearchHighlight?: string;
  isActive?: FieldButtonProps['isActive'];
  isEmpty?: boolean; // whether the field has data or not
  infoIcon?: FieldButtonProps['fieldInfoIcon'];
  className?: FieldButtonProps['className'];
  getCustomFieldType?: GetCustomFieldType<T>;
  onClick: FieldButtonProps['onClick'];
}

/**
 * Inner part of field list item
 * @param field
 * @param fieldSearchHighlight
 * @param isActive
 * @param isEmpty
 * @param infoIcon
 * @param className
 * @param getCustomFieldType
 * @param onClick
 * @param otherProps
 * @constructor
 */
export function FieldItemButton<T extends FieldListItem = DataViewField>({
  field,
  fieldSearchHighlight,
  isActive,
  isEmpty,
  infoIcon,
  className,
  getCustomFieldType,
  onClick,
  ...otherProps
}: FieldItemButtonProps<T>) {
  const displayName = field.displayName || field.name;
  const iconProps = getCustomFieldType
    ? { type: getCustomFieldType(field) }
    : getFieldIconProps(field);
  const type = iconProps.type;

  const classes = classnames(
    'unifiedFieldItemButton',
    {
      [`unifiedFieldItemButton--${type}`]: type,
      [`unifiedFieldItemButton--exists`]: !isEmpty,
      [`unifiedFieldItemButton--missing`]: isEmpty,
    },
    className
  );

  return (
    <FieldButton
      className={classes}
      isActive={isActive}
      buttonProps={{
        ['aria-label']: i18n.translate('unifiedFieldList.fieldItemButtonAriaLabel', {
          defaultMessage: 'Preview {fieldName}: {fieldType}',
          values: {
            fieldName: displayName,
            fieldType: getCustomFieldType ? getCustomFieldType(field) : field.type,
          },
        }),
      }}
      fieldIcon={<FieldIcon {...iconProps} />}
      fieldName={<EuiHighlight search={fieldSearchHighlight || ''}>{displayName}</EuiHighlight>}
      fieldInfoIcon={infoIcon}
      onClick={onClick}
      {...otherProps}
    />
  );
}
