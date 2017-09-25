import React from 'react';

export const wrapWithTabsProps = ({ defaults, getState, setState}) => {
  return (BaseComponent) => (props) => {
    const { selectedTab = defaults.selectedTab } = getState();
    const tabsProps = {
      selectedTab: selectedTab,
      changeTab: tab => setState(tab),
    };

    return <BaseComponent {...props} {...tabsProps}/>
  }
};
