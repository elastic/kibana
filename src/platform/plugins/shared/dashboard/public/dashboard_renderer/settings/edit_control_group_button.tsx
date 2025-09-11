/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ControlGroupApi } from '@kbn/controls-plugin/public';
import { EuiButton } from '@elastic/eui';
import { getEditControlGroupButtonTitle } from '../../dashboard_app/_dashboard_app_strings';

interface Props {
  controlGroupApi?: ControlGroupApi;
}

export const EditControlGroupButton = ({ controlGroupApi, ...rest }: Props) => {
  return (
    <EuiButton
      {...rest}
      iconType="controlsHorizontal"
      data-test-subj="controls-settings-button"
      disabled={!controlGroupApi}
      aria-label={getEditControlGroupButtonTitle()}
      onClick={() => {
        controlGroupApi?.onEdit();
      }}
    >
      {getEditControlGroupButtonTitle()}
    </EuiButton>
  );
};
