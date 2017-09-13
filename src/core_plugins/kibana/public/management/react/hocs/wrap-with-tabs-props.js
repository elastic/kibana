import React, { cloneElement } from 'react';
import { chunk } from 'lodash';

const TabsWrap = (props) => {
  const {
    change,
    transientId,
    children,
    selectedTab,
  } = props;

  // console.log('TabsWrap', props);

  return cloneElement(children, {
    ...props,
    selectedTab,
    changeTab: tab => change(transientId, { tab: selectedTab }),
  });
};

export const wrapWithTabsProps = ({ selectedTab }) => {
  return (BaseComponent) => (props) => (
    <TabsWrap selectedTab={selectedTab} {...props}>
      <BaseComponent/>
    </TabsWrap>
  );
};
