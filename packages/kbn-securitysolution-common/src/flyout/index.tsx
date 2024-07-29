/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ExpandableFlyout, type ExpandableFlyoutProps } from '@kbn/expandable-flyout';
import { useEuiTheme } from '@elastic/eui';
import { HostRightPanel } from './panels';

export * from './common/components';
export * from './common/test_ids';
export { HostRightPanel } from './panels';

const expandableFlyoutPanels: ExpandableFlyoutProps['registeredPanels'] = [
  {
    key: 'host',
    component: (props) => {
      console.log({ props });
      return <HostRightPanel {...props.params} />;
    },
  },
];

export const DiscoverFlyout = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <ExpandableFlyout
      registeredPanels={expandableFlyoutPanels}
      paddingSize="none"
      customStyles={{ 'z-index': (euiTheme.levels.flyout as number) + 2 }}
    />
  );
};

// export const CellFlyoutProvider: PropsWithChildren<{}> = ({ children }) => {
//   const ComponentWithFlyoutActions = (props: ExpandableFlyoutApi) => {
//     return <>{children}</>;
//   };
//
//   const Wrapped = () => {
//     const expandableFlyoutActions = useExpandableFlyoutApi();
//
//     return <ComponentWithFlyoutActions {...expandableFlyoutActions} />;
//   };
//
//   return () => (
//     <ExpandableFlyoutProvider urlKey={'discoverFlyout'}>
//       <Wrapped />
//     </ExpandableFlyoutProvider>
//   );
// };
