/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DevToolsVariablesModal } from '../components';
import { useServicesContext } from '../contexts';
import type { DevToolsVariable } from '../../services';

interface Props {
  onClose: () => void;
}

export function Variables({ onClose }: Props) {
  const {
    services: { variables },
  } = useServicesContext();

  const onSaveVariables = (newVariables: DevToolsVariable[]) => {
    variables.update(newVariables);
  };
  return (
    <DevToolsVariablesModal
      onClose={onClose}
      onSaveVariables={onSaveVariables}
      variablesService={variables}
    />
  );
}
