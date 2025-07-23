/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { ConfigurationFormControlled } from './configuration_form_controlled';
import { useConnectionDetailsService } from '../../../../context';
import { useBehaviorSubject } from '../../../../hooks/use_behavior_subject';

export const ConfigurationForm: React.FC = () => {
  const service = useConnectionDetailsService();
  const keyName = useBehaviorSubject(service.apiKeyName$);
  const keyStatus = useBehaviorSubject(service.apiKeyStatus$);
  const keyError = useBehaviorSubject(service.apiKeyError$);
  const hasAccess = useBehaviorSubject(service.apiKeyHasAccess$);

  const isLoadingPermissions = hasAccess === null;

  return (
    <EuiSkeletonText isLoading={isLoadingPermissions}>
      <ConfigurationFormControlled
        name={keyName}
        error={keyError}
        loading={keyStatus === 'creating'}
        onNameChange={(event) => {
          service.setApiKeyName(event.target.value);
        }}
        onSubmit={(event) => {
          event.preventDefault();
          service.createKey();
        }}
      />
    </EuiSkeletonText>
  );
};
