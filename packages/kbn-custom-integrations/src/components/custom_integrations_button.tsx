/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useSelector } from '@xstate/react';
import { useCustomIntegrations } from '../hooks/use_custom_integrations';
import { createIsInitializedSelector } from '../state_machines/custom_integrations/selectors';
import { ConnectedCreateCustomIntegrationButton } from './create/button';

interface ConnectedCustomIntegrationsButtonProps {
  isDisabled?: boolean;
  onClick?: () => void;
  testSubj?: string;
}

export const ConnectedCustomIntegrationsButton = ({
  isDisabled,
  onClick,
  testSubj = 'customIntegrationsPackageConnectedButton',
}: ConnectedCustomIntegrationsButtonProps) => {
  const { customIntegrationsStateService, customIntegrationsState } = useCustomIntegrations();

  const createIsInitialized = useSelector(
    customIntegrationsStateService,
    createIsInitializedSelector
  );

  if (createIsInitialized) {
    return (
      <ConnectedCreateCustomIntegrationButton
        machine={customIntegrationsState.children.createCustomIntegration}
        isDisabled={isDisabled}
        onClick={onClick}
        testSubj={testSubj}
      />
    );
  } else {
    return null;
  }
};
