/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useServiceAccountDirectory } from '../../../../entities/service_accounts';
import { useKibana } from '../../../../hooks/use_kibana';
import { createServiceAccountEditor } from '../../lib/service_accounts/service_account_editor';

export const useServiceAccountEditor = () => {
  const directory = useServiceAccountDirectory();
  const { cloud, serverless } = useKibana().services;
  const isServerless = cloud?.isServerlessEnabled ?? Boolean(serverless);
  const projectName = cloud?.serverless.projectName;
  const projectId = cloud?.serverless.projectId;
  return useMemo(
    () => createServiceAccountEditor(directory, { isServerless, projectName, projectId }),
    [directory, isServerless, projectName, projectId]
  );
};
