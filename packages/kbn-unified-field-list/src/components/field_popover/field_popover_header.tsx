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
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldDescription, getFieldDescription } from '@kbn/field-utils';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { AddFieldFilterHandler } from '../../types';

export interface FieldPopoverHeaderProps {
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
  showEcsInfo?: boolean;
}

export const FieldPopoverHeader: React.FC<FieldPopoverHeaderProps> = ({
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
  showEcsInfo,
}) => {
  if (!field) {
    return null;
  }
  const description = getFieldDescription(field.name, field.customDescription, showEcsInfo);

  const addFieldToWorkspaceTooltip = i18n.translate(
    'unifiedFieldList.fieldPopover.addFieldToWorkspaceLabel',
    {
      defaultMessage: 'Add "{field}" field',
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
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={true}>
          <EuiTitle size="xxs" data-test-subj="fieldPopoverHeader_fieldDisplayName">
            <h5 className="eui-textBreakWord">{field.displayName}</h5>
          </EuiTitle>
        </EuiFlexItem>
        {onAddFieldToWorkspace && (
          <EuiFlexItem grow={false} data-test-subj="fieldPopoverHeader_addField">
            <EuiToolTip
              content={buttonAddFieldToWorkspaceProps?.['aria-label'] ?? addFieldToWorkspaceTooltip}
            >
              <EuiButtonIcon
                data-test-subj={`fieldPopoverHeader_addField-${field.name}`}
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
        {onAddFilter && field.filterable && !field.scripted && (
          <EuiFlexItem grow={false} data-test-subj="fieldPopoverHeader_addExistsFilter">
            <EuiToolTip content={buttonAddFilterProps?.['aria-label'] ?? addExistsFilterTooltip}>
              <EuiButtonIcon
                data-test-subj={`fieldPopoverHeader_addExistsFilter-${field.name}`}
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
            <EuiFlexItem grow={false} data-test-subj="fieldPopoverHeader_editField">
              <EuiToolTip content={buttonEditFieldProps?.['aria-label'] ?? editFieldTooltip}>
                <EuiButtonIcon
                  data-test-subj={`fieldPopoverHeader_editField-${field.name}`}
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
          <EuiFlexItem grow={false} data-test-subj="fieldPopoverHeader_deleteField">
            <EuiToolTip content={buttonDeleteFieldProps?.['aria-label'] ?? deleteFieldTooltip}>
              <EuiButtonIcon
                data-test-subj={`fieldPopoverHeader_deleteField-${field.name}`}
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
      {description ? (
        <>
          <EuiSpacer size="xs" />
          <FieldDescription name={field.name} description={description} />
        </>
      ) : null}
    </>
  );
};
