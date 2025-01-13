/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ActionFactory as ActionFactoryUi } from '../../components/action_factory';
import { ActionFactory, BaseActionFactoryContext } from '../../../../dynamic_actions';
import { useDrilldownManager } from '../context';

export interface ActionFactoryViewProps {
  factory: ActionFactory;
  context: BaseActionFactoryContext;
  constant?: boolean;
}

export const ActionFactoryView: React.FC<ActionFactoryViewProps> = ({
  factory,
  context,
  constant,
}) => {
  const drilldowns = useDrilldownManager();
  const name = React.useMemo(() => factory.getDisplayName(context), [factory, context]);
  const icon = React.useMemo(() => factory.getIconType(context), [factory, context]);
  const handleChange = React.useMemo(() => {
    if (constant) return undefined;
    return () => drilldowns.setActionFactory(undefined);
  }, [drilldowns, constant]);

  return <ActionFactoryUi name={name} icon={icon} beta={factory.isBeta} onChange={handleChange} />;
};
