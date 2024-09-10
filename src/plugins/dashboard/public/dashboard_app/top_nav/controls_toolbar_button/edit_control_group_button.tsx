/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { ControlGroupContainer } from '@kbn/controls-plugin/public';
import { getEditControlGroupButtonTitle } from '../../_dashboard_app_strings';

interface Props {
  closePopover: () => void;
  controlGroup: ControlGroupContainer;
}

export const EditControlGroupButton = ({ closePopover, controlGroup, ...rest }: Props) => {
  return (
    <EuiContextMenuItem
      {...rest}
      icon="gear"
      data-test-subj="controls-settings-button"
      aria-label={getEditControlGroupButtonTitle()}
      onClick={() => {
        controlGroup.openEditControlGroupFlyout();
        closePopover();
      }}
    >
      {getEditControlGroupButtonTitle()}
    </EuiContextMenuItem>
  );
};
