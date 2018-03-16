import React from 'react';

import { EuiButton } from '@elastic/eui';

export const Tools = ({ isDisabled, onDelete, onExport }) => {
  return [
    <EuiButton
      key="deleteSO"
      iconType="trash"
      color="danger"
      size="s"
      onClick={onDelete}
      isDisabled={isDisabled}
    >
      Delete
    </EuiButton>,
    <EuiButton
      key="exportSO"
      iconType="exportAction"
      size="s"
      onClick={onExport}
      isDisabled={isDisabled}
    >
      Export
    </EuiButton>,
  ];
};
