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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopoverTitle,
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
  onAddFilter?: AddFieldFilterHandler;
  onAddFieldToWorkspace?: (field: DataViewField) => unknown;
  onEditField?: (fieldName: string) => unknown;
  onDeleteField?: (fieldName: string) => unknown;
}

export const FieldPopoverTitle: React.FC<FieldPopoverTitleProps> = ({
  field,
  closePopover,
  onAddFilter,
  onAddFieldToWorkspace,
  onEditField,
  onDeleteField,
}) => {
  const addFieldToWorkspace = i18n.translate(
    'unifiedFieldList.fieldPopover.addFieldToWorkspaceLabel',
    {
      defaultMessage: 'Add "{field}" to workspace',
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

  // TODO: should we double check edit/delete access here too?
  // const canEditDataView = Boolean(dataViewEditor?.userPermissions.editDataView());

  return (
    <EuiPopoverTitle>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={true}>
          <EuiTitle size="xxs">
            <h5 className="eui-textBreakWord" css={titleStyles}>
              {field.displayName}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        {onAddFieldToWorkspace && (
          <EuiFlexItem grow={false} data-test-subj="fieldPopoverTitle_useField">
            <EuiToolTip content={addFieldToWorkspace}>
              <EuiButtonIcon
                onClick={() => {
                  closePopover();
                  onAddFieldToWorkspace(field);
                }}
                iconType="pencil"
                data-test-subj={`fieldPopoverTitle_useField-${field.name}`}
                aria-label={addFieldToWorkspace}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
        {onAddFilter &&
          field.filterable &&
          // !dataView.metaFields.includes(field.name) && // TODO: disable for meta fields?
          !field.scripted && (
            <EuiFlexItem grow={false} data-test-subj="fieldPopoverTitle_addExistsFilter">
              <EuiToolTip content={addExistsFilterTooltip}>
                <EuiButtonIcon
                  onClick={() => {
                    closePopover();
                    onAddFilter('_exists_', field.name, '+');
                  }}
                  iconType="filter"
                  data-test-subj={`fieldPopoverTitle_addExistsFilter-${field.name}`}
                  aria-label={addExistsFilterTooltip}
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        {onEditField &&
          (field.isRuntimeField || !['unknown', 'unknown_selected'].includes(field.type)) && (
            <EuiFlexItem grow={false} data-test-subj="fieldPopoverTitle_editField">
              <EuiToolTip content={editFieldTooltip}>
                <EuiButtonIcon
                  onClick={() => {
                    closePopover();
                    onEditField(field.name);
                  }}
                  iconType="pencil"
                  data-test-subj={`fieldPopoverTitle_editField-${field.name}`}
                  aria-label={editFieldTooltip}
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        {onDeleteField && field.isRuntimeField && (
          <EuiFlexItem grow={false} data-test-subj="fieldPopoverTitle_deleteField">
            <EuiToolTip content={deleteFieldTooltip}>
              <EuiButtonIcon
                onClick={() => {
                  closePopover();
                  onDeleteField(field.name);
                }}
                iconType="trash"
                data-test-subj={`fieldPopoverTitle_deleteField-${field.name}`}
                color="danger"
                aria-label={deleteFieldTooltip}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPopoverTitle>
  );
};
