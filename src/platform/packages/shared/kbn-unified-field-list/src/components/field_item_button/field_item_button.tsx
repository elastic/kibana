/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import classnames from 'classnames';
import { css } from '@emotion/react';
import { FieldButton, type FieldButtonProps } from '@kbn/react-field';
import {
  EuiButtonIcon,
  EuiButtonIconProps,
  EuiHighlight,
  EuiIcon,
  EuiToolTip,
  useEuiShadow,
  type UseEuiTheme,
} from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { FieldIcon, getFieldIconProps, getFieldSearchMatchingHighlight } from '@kbn/field-utils';
import { type FieldListItem, type GetCustomFieldType } from '../../types';

const DRAG_ICON = <EuiIcon type="grabOmnidirectional" size="m" />;

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
  withDragIcon?: boolean;
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
 * @param withDragIcon
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
  withDragIcon,
  onClick,
  shouldAlwaysShowAction,
  buttonAddFieldToWorkspaceProps,
  buttonRemoveFieldFromWorkspaceProps,
  onAddFieldToWorkspace,
  onRemoveFieldFromWorkspace,
  ...otherProps
}: FieldItemButtonProps<T>) {
  const euiShadow = useEuiShadow('xs');

  const fieldButtonCss = ({ euiTheme }: UseEuiTheme) => css`
    width: 100%;
    background: ${euiTheme.colors.emptyShade};
    border-radius: ${euiTheme.border.radius};
    color: ${isEmpty ? euiTheme.colors.darkShade : undefined};
    ${euiShadow}

    &.kbnFieldButton {
      &:focus-within,
      &-isActive {
        ${removeEuiFocusRing};
      }
    }

    .kbnFieldButton__button:focus {
      ${passDownFocusRing(euiTheme, '.kbnFieldButton__nameInner')};
    }

    & button .kbnFieldButton__nameInner:hover {
      text-decoration: underline;
    }

    &:hover,
    &[class*='-isActive'] {
      .unifiedFieldListItemButton__action {
        opacity: 1;
      }
    }

    .unifiedFieldListItemButton__fieldIconDrag {
      visibility: visible;
      opacity: 0;
    }

    &:hover,
    &[class*='-isActive'],
    .domDraggable__keyboardHandler:focus + & {
      .unifiedFieldListItemButton__fieldIcon {
        opacity: 0;
      }
      .unifiedFieldListItemButton__fieldIconDrag {
        opacity: 1;
      }
    }
  `;

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
      [`unifiedFieldListItemButton--withDragIcon`]: Boolean(withDragIcon),
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
            data-test-subj={`fieldToggle-${field.name}`}
            aria-label={removeFieldFromWorkspaceTooltip}
            {...(buttonRemoveFieldFromWorkspaceProps || {})}
            className={classnames(
              fieldActionClassName,
              buttonRemoveFieldFromWorkspaceProps?.className
            )}
            css={unifiedFieldListItemButtonActionCss}
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
            data-test-subj={`fieldToggle-${field.name}`}
            aria-label={addFieldToWorkspaceTooltip}
            {...(buttonAddFieldToWorkspaceProps || {})}
            className={classnames(fieldActionClassName, buttonAddFieldToWorkspaceProps?.className)}
            css={unifiedFieldListItemButtonActionCss}
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

  const conflictInfoIcon =
    field.type === 'conflict' ? (
      <FieldConflictInfoIcon conflictDescriptions={field.conflictDescriptions} />
    ) : null;

  return (
    <FieldButton
      key={`field-item-button-${field.name}`}
      dataTestSubj={dataTestSubj || `field-${field.name}-showDetails`}
      size={size || 's'}
      className={classes}
      css={fieldButtonCss}
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
      fieldIcon={
        <div css={fieldIconContainer}>
          <div
            className="unifiedFieldListItemButton__fieldIcon" // class is used in functional tests and dependent styles
            css={fieldIconCss}
          >
            <FieldIcon {...iconProps} />
          </div>
          {withDragIcon && (
            <div
              className="unifiedFieldListItemButton__fieldIconDrag" // class is used in dependent styles
              css={dragHandleCss}
            >
              {DRAG_ICON}
            </div>
          )}
        </div>
      }
      fieldName={
        <EuiHighlight
          search={getFieldSearchMatchingHighlight(displayName, fieldSearchHighlight)}
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

function FieldConflictInfoIcon({
  conflictDescriptions,
}: {
  conflictDescriptions?: Record<string, string[]>;
}) {
  const types = conflictDescriptions ? Object.keys(conflictDescriptions) : [];
  return (
    <EuiToolTip
      position="bottom"
      title={i18n.translate('unifiedFieldList.fieldItemButton.mappingConflictTitle', {
        defaultMessage: 'Mapping Conflict',
      })}
      content={
        types.length
          ? i18n.translate('unifiedFieldList.fieldItemButton.mappingConflictWithTypesDescription', {
              defaultMessage:
                'This field is defined as several types ({types}) across the indices that match this pattern. You may still be able to use this conflicting field, but it will be unavailable for functions that require Kibana to know their type. Correcting this issue will require reindexing your data.',
              values: {
                types: types.join(', '),
              },
            })
          : i18n.translate('unifiedFieldList.fieldItemButton.mappingConflictDescription', {
              defaultMessage:
                'This field is defined as several types (string, integer, etc) across the indices that match this pattern.' +
                'You may still be able to use this conflicting field, but it will be unavailable for functions that require Kibana to know their type. Correcting this issue will require reindexing your data.',
            })
      }
    >
      <EuiIcon tabIndex={0} type="warning" size="s" />
    </EuiToolTip>
  );
}

const removeEuiFocusRing = css`
  outline: none;

  &:focus-visible {
    outline-style: none;
  }
`;

/**
 * 1. Only visually hide the action, so that it's still accessible to screen readers.
 * 2. When tabbed to, this element needs to be visible for keyboard accessibility.
 */
const unifiedFieldListItemButtonActionCss = css`
  opacity: 0; /* 1 */

  &--always {
    opacity: 1;
  }

  &:focus {
    opacity: 1; /* 2 */
  }
`;

const passDownFocusRing = (euiTheme: UseEuiTheme['euiTheme'], target: string) => css`
  ${removeEuiFocusRing}

  ${target} {
    /* Safari & Firefox */
    outline: ${euiTheme.focus.width} solid currentColor;
  }

  &:focus-visible ${target} {
    /* Chrome */
    outline-style: auto;
  }

  &:not(:focus-visible) ${target} {
    outline: none;
  }
`;

const fieldIconContainer = css`
  position: relative;
`;

const fieldIconCss = ({ euiTheme }: UseEuiTheme) =>
  css`
    transition: opacity ${euiTheme.animation.normal} ease-in-out;
  `;

const dragHandleCss = ({ euiTheme }: UseEuiTheme) => css`
  visibility: hidden;
  position: absolute;
  top: 0;
  left: 0;
  transition: opacity ${euiTheme.animation.normal} ease-in-out;
  opacity: 0;
`;
