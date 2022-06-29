/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { ActionFactoryPicker as ActionFactoryPickerUi } from '../../../../components/action_factory_picker';
import { useDrilldownManager } from '../context';
import { ActionFactoryView } from '../action_factory_view';

export const ActionFactoryPicker: React.FC = ({}) => {
  const drilldowns = useDrilldownManager();
  const factory = drilldowns.useActionFactory();
  const context = React.useMemo(() => drilldowns.getActionFactoryContext(), [drilldowns]);
  const compatibleFactories = drilldowns.useCompatibleActionFactories(context);

  if (!!factory) {
    return <ActionFactoryView factory={factory} context={context} />;
  }

  if (!compatibleFactories) {
    return <EuiLoadingSpinner size="m" />;
  }

  return (
    <ActionFactoryPickerUi
      actionFactories={compatibleFactories}
      context={context}
      onSelect={(actionFactory) => {
        drilldowns.setActionFactory(actionFactory);
      }}
    />
  );
};
