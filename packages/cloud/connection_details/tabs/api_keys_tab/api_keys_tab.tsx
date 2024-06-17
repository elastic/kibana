/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { useConnectionDetailsService } from '../../context';
import { useBehaviorSubject } from '../../hooks/use_behavior_subject';
import { ConfigurationForm } from './views/configuration_form';
import { MissingPermissionsPanel } from './views/missing_permissions_panel';
import { SuccessForm } from './views/success_form';

export const ApiKeysTab: React.FC = () => {
  const service = useConnectionDetailsService();
  const { apiKeys } = service.opts;
  const apiKey = useBehaviorSubject(service.apiKey$);
  const hasAccess = useBehaviorSubject(service.apiKeyHasAccess$);

  if (!apiKeys) return null;
  if (hasAccess === false) return <MissingPermissionsPanel />;
  if (apiKey) return <SuccessForm />;

  return <ConfigurationForm />;
};
