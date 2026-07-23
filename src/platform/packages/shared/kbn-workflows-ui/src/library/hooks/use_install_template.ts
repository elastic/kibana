/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useMutation, type UseMutationOptions } from '@kbn/react-query';
import type { InstallTemplateResponse } from '../../api/types';
import { useWorkflowsApi } from '../../api/use_workflows_api';

type HttpError = IHttpFetchError<ResponseErrorBody>;

/**
 * Installs a Workflow Template Library template: the server renders the
 * template with the submitted install-form values and creates a workflow
 * through the standard create path. Resolves with the new workflow's ID.
 */
export const useInstallTemplate = (
  slug: string,
  options?: UseMutationOptions<InstallTemplateResponse, HttpError, Record<string, unknown>>
) => {
  const api = useWorkflowsApi();

  return useMutation<InstallTemplateResponse, HttpError, Record<string, unknown>>({
    mutationKey: ['workflows-library', 'install', slug],
    mutationFn: (values) => api.installTemplate(slug, values),
    ...options,
  });
};
