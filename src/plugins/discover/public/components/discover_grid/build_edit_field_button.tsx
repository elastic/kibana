/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiListGroupItemProps } from '@elastic/eui';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { getFieldCapabilities } from '../../utils/get_field_capabilities';

export const buildEditFieldButton = ({
  hasEditDataViewPermission,
  dataView,
  field,
  editField,
}: {
  hasEditDataViewPermission: () => boolean;
  dataView: DataView;
  field: DataViewField;
  editField: (fieldName: string) => void;
}) => {
  if (field.name === '_source') {
    return null;
  }

  const { canEdit: canEditField } = getFieldCapabilities(dataView, field);
  const canEditDataView = hasEditDataViewPermission() || !dataView.isPersisted();

  if (!canEditField || !canEditDataView) {
    return null;
  }

  const editFieldButton: EuiListGroupItemProps = {
    size: 'xs',
    label: (
      <FormattedMessage id="discover.grid.editFieldButton" defaultMessage="Edit data view field" />
    ),
    iconType: 'pencil',
    iconProps: { size: 'm' },
    onClick: () => {
      editField(field.name);
    },
    'data-test-subj': 'gridEditFieldButton',
  };

  return editFieldButton;
};
