import React from 'react';

import {
  KuiBar,
  KuiBarSection,
  KuiButton
} from '../../../../components';

export default () => (
  <KuiBar>
    <KuiBarSection>
      <div className="kuiButtonGroup">
        <KuiButton buttonType="basic">
        See previous 10 pages
        </KuiButton>
        <KuiButton buttonType="basic">
        See next 10 pages
        </KuiButton>
      </div>
    </KuiBarSection>
  </KuiBar>
);
