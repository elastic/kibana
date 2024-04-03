/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useSelector } from '@xstate/react';
import { useCustomIntegrations } from '../hooks/use_custom_integrations';
import { createIsInitializedSelector } from '../state_machines/custom_integrations/selectors';
import { ConnectedCreateCustomIntegrationForm, CreateTestSubjects } from './create/form';

interface Props {
  testSubjects?: {
    create?: CreateTestSubjects;
  };
}

export const ConnectedCustomIntegrationsForm = ({ testSubjects }: Props) => {
  const { customIntegrationsState, customIntegrationsStateService } = useCustomIntegrations();

  const createIsInitialized = useSelector(
    customIntegrationsStateService,
    createIsInitializedSelector
  );

  if (createIsInitialized) {
    return (
      <ConnectedCreateCustomIntegrationForm
        machineRef={customIntegrationsState.children.createCustomIntegration}
        testSubjects={testSubjects?.create}
      />
    );
  } else {
    return null;
  }
};
