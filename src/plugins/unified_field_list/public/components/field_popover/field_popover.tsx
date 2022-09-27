/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPopover, EuiPopoverProps, EuiPopoverTitle } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { FieldPopoverTitle, FieldPopoverTitleProps } from './field_popover_title';

export interface FieldPopoverProps extends EuiPopoverProps {
  field: DataViewField;
  buttonAddFieldToWorkspaceProps?: FieldPopoverTitleProps['buttonAddFieldToWorkspaceProps'];
  buttonAddFilterProps?: FieldPopoverTitleProps['buttonAddFilterProps'];
  buttonEditFieldProps?: FieldPopoverTitleProps['buttonEditFieldProps'];
  buttonDeleteFieldProps?: FieldPopoverTitleProps['buttonDeleteFieldProps'];
  onAddFilter?: FieldPopoverTitleProps['onAddFilter'];
  onAddFieldToWorkspace?: FieldPopoverTitleProps['onAddFieldToWorkspace'];
  onEditField?: FieldPopoverTitleProps['onEditField'];
  onDeleteField?: FieldPopoverTitleProps['onDeleteField'];
}

const FieldPopover: React.FC<FieldPopoverProps> = ({
  isOpen,
  closePopover,
  field,
  buttonAddFieldToWorkspaceProps,
  buttonAddFilterProps,
  buttonEditFieldProps,
  buttonDeleteFieldProps,
  onAddFilter,
  onAddFieldToWorkspace,
  onEditField,
  onDeleteField,
  children,
  ...otherPopoverProps
}) => {
  const title = (
    <FieldPopoverTitle
      field={field}
      closePopover={closePopover}
      buttonAddFieldToWorkspaceProps={buttonAddFieldToWorkspaceProps}
      buttonAddFilterProps={buttonAddFilterProps}
      buttonEditFieldProps={buttonEditFieldProps}
      buttonDeleteFieldProps={buttonDeleteFieldProps}
      onAddFilter={onAddFilter}
      onAddFieldToWorkspace={onAddFieldToWorkspace}
      onEditField={onEditField}
      onDeleteField={onDeleteField}
    />
  );

  return (
    <EuiPopover
      ownFocus
      isOpen={isOpen}
      closePopover={closePopover}
      display="block"
      anchorPosition="rightUp"
      data-test-subj="fieldPopover"
      panelClassName="fieldPopoverPanel"
      {...otherPopoverProps}
    >
      {children ? <EuiPopoverTitle>{title}</EuiPopoverTitle> : title}
      {isOpen && children}
    </EuiPopover>
  );
};

// Necessary for React.lazy
// eslint-disable-next-line import/no-default-export
export default FieldPopover;
