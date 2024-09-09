/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DevToolsVariablesFlyout, DevToolsVariable } from '../components';
import { useServicesContext } from '../contexts';
import { StorageKeys } from '../../services';
import { DEFAULT_VARIABLES } from '../../../common/constants';

interface VariablesProps {
  onClose: () => void;
}

export function Variables({ onClose }: VariablesProps) {
  const {
    services: { storage },
  } = useServicesContext();

  const onSaveVariables = (newVariables: DevToolsVariable[]) => {
    storage.set(StorageKeys.VARIABLES, newVariables);
    onClose();
  };
  return (
    <DevToolsVariablesFlyout
      onClose={onClose}
      onSaveVariables={onSaveVariables}
      variables={storage.get(StorageKeys.VARIABLES, DEFAULT_VARIABLES)}
    />
  );
}
