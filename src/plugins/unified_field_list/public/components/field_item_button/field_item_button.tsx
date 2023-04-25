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
import { EuiButtonIcon, EuiButtonIconProps, EuiHighlight, EuiIcon, EuiToolTip } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { type FieldListItem, type GetCustomFieldType } from '../../types';
import { FieldIcon, getFieldIconProps } from '../field_icon';
import { fieldNameWildcardMatcher } from '../../utils/field_name_wildcard_matcher';
import './field_item_button.scss';

/**
 * Props of FieldItemButton component
 */
export interface FieldItemButtonProps<T extends FieldListItem> {
  field: T;
  fieldSearchHighlight?: string;
  isSelected: boolean; // whether a field is under Selected section
  isActive: FieldButtonProps['isActive']; // whether a popover is open
  isEmpty: boolean; // whether the field has data or not
  infoIcon?: FieldButtonProps['fieldInfoIcon'];
  className?: FieldButtonProps['className'];
  flush?: FieldButtonProps['flush'];
  dragHandle?: FieldButtonProps['dragHandle'];
  getCustomFieldType?: GetCustomFieldType<T>;
  dataTestSubj?: string;
  size?: FieldButtonProps['size'];
  onClick: FieldButtonProps['onClick'];
  shouldAlwaysShowAction?: boolean; // should the field action be visible on hover or always
  buttonAddFieldToWorkspaceProps?: Partial<EuiButtonIconProps>;
  buttonRemoveFieldFromWorkspaceProps?: Partial<EuiButtonIconProps>;
  onAddFieldToWorkspace?: (field: T) => unknown;
  onRemoveFieldFromWorkspace?: (field: T) => unknown;
}

/**
 * Field list item component
 * @param field
 * @param fieldSearchHighlight
 * @param isSelected
 * @param isActive
 * @param isEmpty
 * @param infoIcon
 * @param className
 * @param getCustomFieldType
 * @param dataTestSubj
 * @param size
 * @param onClick
 * @param shouldAlwaysShowAction
 * @param buttonAddFieldToWorkspaceProps
 * @param buttonRemoveFieldFromWorkspaceProps
 * @param onAddFieldToWorkspace
 * @param onRemoveFieldFromWorkspace
 * @param otherProps
 * @constructor
 */
export function FieldItemButton<T extends FieldListItem = DataViewField>({
  field,
  fieldSearchHighlight,
  isSelected,
  isActive,
  isEmpty,
  infoIcon,
  className,
  getCustomFieldType,
  dataTestSubj,
  size,
  onClick,
  shouldAlwaysShowAction,
  buttonAddFieldToWorkspaceProps,
  buttonRemoveFieldFromWorkspaceProps,
  onAddFieldToWorkspace,
  onRemoveFieldFromWorkspace,
  ...otherProps
}: FieldItemButtonProps<T>) {
  const displayName = field.displayName || field.name;
  const title =
    displayName !== field.name && field.name !== '___records___'
      ? i18n.translate('unifiedFieldList.fieldItemButton.fieldTitle', {
          defaultMessage: '{fieldDisplayName} ({fieldName})',
          values: {
            fieldName: field.name,
            fieldDisplayName: displayName,
          },
        })
      : displayName;

  const iconProps = getCustomFieldType
    ? { type: getCustomFieldType(field) }
    : getFieldIconProps(field);
  const type = iconProps.type;

  const classes = classnames(
    'unifiedFieldListItemButton',
    {
      [`unifiedFieldListItemButton--${type}`]: type,
      [`unifiedFieldListItemButton--exists`]: !isEmpty,
      [`unifiedFieldListItemButton--missing`]: isEmpty,
    },
    className
  );

  const addFieldToWorkspaceTooltip =
    buttonAddFieldToWorkspaceProps?.['aria-label'] ??
    i18n.translate('unifiedFieldList.fieldItemButton.addFieldToWorkspaceLabel', {
      defaultMessage: 'Add "{field}" field',
      values: {
        field: field.displayName,
      },
    });

  const removeFieldFromWorkspaceTooltip =
    buttonRemoveFieldFromWorkspaceProps?.['aria-label'] ??
    i18n.translate('unifiedFieldList.fieldItemButton.removeFieldToWorkspaceLabel', {
      defaultMessage: 'Remove "{field}" field',
      values: {
        field: field.displayName,
      },
    });

  const fieldActionClassName = classnames('unifiedFieldListItemButton__action', {
    'unifiedFieldListItemButton__action--always': shouldAlwaysShowAction,
  });
  const fieldAction = isSelected
    ? onRemoveFieldFromWorkspace && (
        <EuiToolTip
          key={`selected-to-remove-${field.name}-${removeFieldFromWorkspaceTooltip}`}
          content={removeFieldFromWorkspaceTooltip}
        >
          <EuiButtonIcon
            data-test-subj={`unifiedFieldListItem_removeField-${field.name}`}
            aria-label={removeFieldFromWorkspaceTooltip}
            {...(buttonRemoveFieldFromWorkspaceProps || {})}
            className={classnames(
              fieldActionClassName,
              buttonRemoveFieldFromWorkspaceProps?.className
            )}
            color="danger"
            iconType="cross"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();
              onRemoveFieldFromWorkspace(field);
            }}
          />
        </EuiToolTip>
      )
    : onAddFieldToWorkspace && (
        <EuiToolTip
          key={`deselected-to-add-${field.name}-${addFieldToWorkspaceTooltip}`}
          content={addFieldToWorkspaceTooltip}
        >
          <EuiButtonIcon
            data-test-subj={`unifiedFieldListItem_addField-${field.name}`}
            aria-label={addFieldToWorkspaceTooltip}
            {...(buttonAddFieldToWorkspaceProps || {})}
            className={classnames(fieldActionClassName, buttonAddFieldToWorkspaceProps?.className)}
            color="text"
            iconType="plusInCircle"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();
              onAddFieldToWorkspace(field);
            }}
          />
        </EuiToolTip>
      );

  const conflictInfoIcon = field.type === 'conflict' ? <FieldConflictInfoIcon /> : null;

  return (
    <FieldButton
      key={`field-item-button-${field.name}`}
      dataTestSubj={dataTestSubj}
      size={size || 's'}
      className={classes}
      isActive={isActive}
      buttonProps={{
        ['aria-label']: i18n.translate('unifiedFieldList.fieldItemButton.ariaLabel', {
          defaultMessage: 'Preview {fieldDisplayName}: {fieldType}',
          values: {
            fieldDisplayName: displayName,
            fieldType: getCustomFieldType ? getCustomFieldType(field) : field.type,
          },
        }),
      }}
      fieldIcon={<FieldIcon {...iconProps} />}
      fieldName={
        <EuiHighlight
          search={getSearchHighlight(displayName, fieldSearchHighlight)}
          title={title}
          data-test-subj={`field-${field.name}`}
        >
          {displayName}
        </EuiHighlight>
      }
      fieldAction={fieldAction}
      fieldInfoIcon={conflictInfoIcon || infoIcon}
      onClick={onClick}
      {...otherProps}
    />
  );
}

function FieldConflictInfoIcon() {
  return (
    <EuiToolTip
      position="bottom"
      content={i18n.translate('unifiedFieldList.fieldItemButton.mappingConflictDescription', {
        defaultMessage:
          'This field is defined as several types (string, integer, etc) across the indices that match this pattern.' +
          'You may still be able to use this conflicting field, but it will be unavailable for functions that require Kibana to know their type. Correcting this issue will require reindexing your data.',
      })}
    >
      <EuiIcon
        tabIndex={0}
        type="warning"
        title={i18n.translate('unifiedFieldList.fieldItemButton.mappingConflictTitle', {
          defaultMessage: 'Mapping Conflict',
        })}
        size="s"
      />
    </EuiToolTip>
  );
}

function getSearchHighlight(displayName: string, fieldSearchHighlight?: string): string {
  const searchHighlight = fieldSearchHighlight || '';
  if (
    searchHighlight.includes('*') &&
    fieldNameWildcardMatcher({ name: displayName }, searchHighlight)
  ) {
    return displayName;
  }

  return searchHighlight;
}
