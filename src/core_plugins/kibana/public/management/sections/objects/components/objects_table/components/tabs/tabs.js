import React from 'react';

import {
  EuiTabs,
  EuiTab,
} from '@elastic/eui';

export const Tabs = ({
  tabConfig,
  changeTab,
  selectedTabId,
}) => {
  const tabs = tabConfig.map(tab => {
    return (
      <EuiTab
        onClick={() => changeTab(tab.id)}
        isSelected={tab.id === selectedTabId}
        disabled={tab.disabled}
        key={tab.id}
      >
        {tab.name}&nbsp;({tab.count})
      </EuiTab>
    );
  });

  return (
    <EuiTabs>
      {tabs}
    </EuiTabs>
  );
};
