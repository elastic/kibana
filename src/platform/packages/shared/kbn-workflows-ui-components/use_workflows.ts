/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import { useState, useEffect, useCallback } from 'react';
import type { HttpStart } from '@kbn/core/public';
import type { WorkflowListDto } from '@kbn/workflows';
import type { WorkflowOption } from './workflow_selector';

export function useWorkflows(http: HttpStart) {
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await http.post<WorkflowListDto>('/api/workflows/search', {
        body: JSON.stringify({
          limit: 1000,
          page: 1,
          query: '',
        }),
      });

      const workflowOptions: WorkflowOption[] = response.results.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        enabled: workflow.enabled,
        tags: workflow.definition?.tags || [],
        label: workflow.name,
        disabled: !workflow.enabled,
        data: {
          secondaryContent: workflow.description || 'No description',
        },
      }));

      setWorkflows(workflowOptions);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [http]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return {
    workflows,
    isLoading,
    loadError,
    refetch: fetchWorkflows,
  };
}
