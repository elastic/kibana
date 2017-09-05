import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton buttonType="secondary">
      Secondary button
    </KuiButton>

    <br />
    <br />

    <KuiButton
      buttonType="secondary"
      disabled
    >
      Secondary button, disabled
    </KuiButton>
  </div>
);

