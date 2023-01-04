/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { ControlGroupContainer } from '@kbn/controls-plugin/public';
import { getAddControlButtonTitle } from '../../_dashboard_app_strings';

interface Props {
  closePopover: () => void;
  controlGroup: ControlGroupContainer;
}

export const AddDataControlButton = ({ closePopover, controlGroup }: Props) => {
  return (
    <EuiContextMenuItem
      key="addControl"
      icon="plusInCircle"
      data-test-subj="controls-create-button"
      aria-label={getAddControlButtonTitle()}
      onClick={() => {
        controlGroup.openAddDataControlFlyout();
        closePopover();
      }}
    >
      {getAddControlButtonTitle()}
    </EuiContextMenuItem>
  );
};
