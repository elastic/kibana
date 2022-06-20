/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DevToolsVariablesModal, DevToolsVariable } from '../components';
import { useServicesContext } from '../contexts';

interface Props {
  onClose: () => void;
}

export function Variables({ onClose }: Props) {
  const {
    services: { storage },
  } = useServicesContext();

  const onSaveVariables = (newVariables: DevToolsVariable[]) => {
    storage.set('variables', newVariables);
    onClose();
  };
  return (
    <DevToolsVariablesModal
      onClose={onClose}
      onSaveVariables={onSaveVariables}
      variables={storage.get('variables', [])}
    />
  );
}
