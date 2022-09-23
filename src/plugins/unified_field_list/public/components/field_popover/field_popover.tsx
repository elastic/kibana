/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPopover, EuiPopoverProps } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { FieldPopoverTitle, FieldPopoverTitleProps } from './field_popover_title';

export interface FieldPopoverProps extends EuiPopoverProps {
  field: DataViewField;
  onAddFilter?: FieldPopoverTitleProps['onAddFilter'];
  onAddFieldToWorkspace?: FieldPopoverTitleProps['onAddFieldToWorkspace'];
  onEditField?: FieldPopoverTitleProps['onEditField'];
  onDeleteField?: FieldPopoverTitleProps['onDeleteField'];
}

const FieldPopover: React.FC<FieldPopoverProps> = ({
  isOpen,
  closePopover,
  field,
  onAddFilter,
  onAddFieldToWorkspace,
  onEditField,
  onDeleteField,
  children,
  ...otherPopoverProps
}) => {
  return (
    <EuiPopover
      ownFocus
      isOpen={isOpen}
      closePopover={closePopover}
      display="block"
      anchorPosition="rightUp"
      data-test-subj="unifiedFieldList_fieldPopover"
      panelClassName="unifiedFieldList_fieldPopoverPanel"
      {...otherPopoverProps}
    >
      <FieldPopoverTitle
        field={field}
        closePopover={closePopover}
        onAddFilter={onAddFilter}
        onAddFieldToWorkspace={onAddFieldToWorkspace}
        onEditField={onEditField}
        onDeleteField={onDeleteField}
      />
      {isOpen && children}
    </EuiPopover>
  );
};

// Necessary for React.lazy
// eslint-disable-next-line import/no-default-export
export default FieldPopover;
