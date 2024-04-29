/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { useConnectionDetailsService } from '../../../../context';
import { useBehaviorSubject } from '../../../../hooks/use_behavior_subject';
import { SuccessFormControlled } from './success_form_controlled';

export const SuccessForm: React.FC = () => {
  const service = useConnectionDetailsService();
  const apiKey = useBehaviorSubject(service.apiKey$);
  const format = useBehaviorSubject(service.apiKeyFormat$);

  if (!apiKey) return null;

  return (
    <SuccessFormControlled
      apiKey={apiKey}
      format={format}
      onFormatChange={service.setApiKeyFormat}
    />
  );
};
