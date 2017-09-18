import React, { cloneElement } from 'react';
import { chunk, get } from 'lodash';

const TabsWrap = (props) => {
  const {
    children,
    tabsPath,
    action,
    defaultSelectedTab,
    ...rest,
  } = props;

  const {
    selectedTab,
  } = get(props, tabsPath, { selectedTab: defaultSelectedTab });

  console.log('TabsWrap', props, selectedTab);

  return cloneElement(children, {
    ...rest,
    selectedTab,
    changeTab: tab => action(tabsPath, { selectedTab: tab }),
  });
};

export const wrapWithTabsProps = ({ tabsPath, action, selectedTab }) => {
  return (BaseComponent) => (props) => (
    <TabsWrap
      tabsPath={tabsPath}
      action={action}
      defaultSelectedTab={selectedTab}
      {...props}
    >
      <BaseComponent/>
    </TabsWrap>
  );
};
