import React from 'react';

import {
  KuiToolBar,
  KuiToolBarSearchBox,
  KuiPager
} from '../../../../components';

export const ToolBarPager = () => (
  <KuiToolBar>
    <KuiToolBarSearchBox onFilter={() => {}} />

    <div className="kuiToolBarSection">
      <KuiPager
        startNumber={1}
        endNumber={20}
        totalItems={33}
        hasNextPage={true}
        hasPreviousPage={false}
        onNextPage={() => {}}
        onPreviousPage={() => {}}
      />
    </div>
  </KuiToolBar>
);
