/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiButtonIconProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopoverProps,
  EuiToolTip,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { AddFieldFilterHandler } from '../../types';

const titleStyles = css`
  text-transform: none;
`;

export interface FieldPopoverTitleProps {
  field: DataViewField;
  closePopover: EuiPopoverProps['closePopover'];
  buttonAddFieldToWorkspaceProps?: Partial<EuiButtonIconProps>;
  buttonAddFilterProps?: Partial<EuiButtonIconProps>;
  buttonEditFieldProps?: Partial<EuiButtonIconProps>;
  buttonDeleteFieldProps?: Partial<EuiButtonIconProps>;
  onAddFieldToWorkspace?: (field: DataViewField) => unknown;
  onAddFilter?: AddFieldFilterHandler;
  onEditField?: (fieldName: string) => unknown;
  onDeleteField?: (fieldName: string) => unknown;
}

export const FieldPopoverTitle: React.FC<FieldPopoverTitleProps> = ({
  field,
  closePopover,
  buttonAddFieldToWorkspaceProps,
  buttonAddFilterProps,
  buttonEditFieldProps,
  buttonDeleteFieldProps,
  onAddFieldToWorkspace,
  onAddFilter,
  onEditField,
  onDeleteField,
}) => {
  const addFieldToWorkspaceTooltip = i18n.translate(
    'unifiedFieldList.fieldPopover.addFieldToWorkspaceLabel',
    {
      defaultMessage: 'Add "{field}"',
      values: {
        field: field.displayName,
      },
    }
  );

  const addExistsFilterTooltip = i18n.translate(
    'unifiedFieldList.fieldPopover.addExistsFilterLabel',
    {
      defaultMessage: 'Filter for field present',
    }
  );

  const editFieldTooltip = i18n.translate('unifiedFieldList.fieldPopover.editFieldLabel', {
    defaultMessage: 'Edit data view field',
  });

  const deleteFieldTooltip = i18n.translate('unifiedFieldList.fieldPopover.deleteFieldLabel', {
    defaultMessage: 'Delete data view field',
  });

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={true}>
        <EuiTitle size="xxs">
          <h5 className="eui-textBreakWord" css={titleStyles}>
            {field.displayName}
          </h5>
        </EuiTitle>
      </EuiFlexItem>
      {onAddFieldToWorkspace && (
        <EuiFlexItem grow={false} data-test-subj="fieldPopoverTitle_addField">
          <EuiToolTip
            content={buttonAddFieldToWorkspaceProps?.['aria-label'] ?? addFieldToWorkspaceTooltip}
          >
            <EuiButtonIcon
              data-test-subj={`fieldPopoverTitle_addField-${field.name}`}
              aria-label={addFieldToWorkspaceTooltip}
              {...(buttonAddFieldToWorkspaceProps || {})}
              iconType="plusInCircle"
              onClick={() => {
                closePopover();
                onAddFieldToWorkspace(field);
              }}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {onAddFilter &&
        field.filterable &&
        // !dataView.metaFields.includes(field.name) && // TODO: disable for meta fields?
        !field.scripted && (
          <EuiFlexItem grow={false} data-test-subj="fieldPopoverTitle_addExistsFilter">
            <EuiToolTip content={buttonAddFilterProps?.['aria-label'] ?? addExistsFilterTooltip}>
              <EuiButtonIcon
                data-test-subj={`fieldPopoverTitle_addExistsFilter-${field.name}`}
                aria-label={addExistsFilterTooltip}
                {...(buttonAddFilterProps || {})}
                iconType="filter"
                onClick={() => {
                  closePopover();
                  onAddFilter('_exists_', field.name, '+');
                }}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      {onEditField &&
        (field.isRuntimeField || !['unknown', 'unknown_selected'].includes(field.type)) && (
          <EuiFlexItem grow={false} data-test-subj="fieldPopoverTitle_editField">
            <EuiToolTip content={buttonEditFieldProps?.['aria-label'] ?? editFieldTooltip}>
              <EuiButtonIcon
                data-test-subj={`fieldPopoverTitle_editField-${field.name}`}
                aria-label={editFieldTooltip}
                {...(buttonEditFieldProps || {})}
                iconType="pencil"
                onClick={() => {
                  closePopover();
                  onEditField(field.name);
                }}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      {onDeleteField && field.isRuntimeField && (
        <EuiFlexItem grow={false} data-test-subj="fieldPopoverTitle_deleteField">
          <EuiToolTip content={buttonDeleteFieldProps?.['aria-label'] ?? deleteFieldTooltip}>
            <EuiButtonIcon
              data-test-subj={`fieldPopoverTitle_deleteField-${field.name}`}
              aria-label={deleteFieldTooltip}
              {...(buttonDeleteFieldProps || {})}
              color="danger"
              iconType="trash"
              onClick={() => {
                closePopover();
                onDeleteField(field.name);
              }}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
