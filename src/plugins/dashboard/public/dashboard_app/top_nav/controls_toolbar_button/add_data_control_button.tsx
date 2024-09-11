/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { getAddControlButtonTitle } from '../../_dashboard_app_strings';
import { useDashboardAPI } from '../../dashboard_app';

interface Props {
  closePopover: () => void;
  controlGroupApi?: ControlGroupApi;
}

export const AddDataControlButton = ({ closePopover, controlGroupApi, ...rest }: Props) => {
  const dashboard = useDashboardAPI();
  const onSave = () => {
    dashboard.scrollToTop();
  };

  return (
    <EuiContextMenuItem
      {...rest}
      icon="plusInCircle"
      data-test-subj="controls-create-button"
      disabled={!controlGroupApi}
      aria-label={getAddControlButtonTitle()}
      onClick={() => {
        controlGroupApi?.openAddDataControlFlyout({ onSave });
        closePopover();
      }}
    >
      {getAddControlButtonTitle()}
    </EuiContextMenuItem>
  );
};
