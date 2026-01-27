/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';

export const useExecutionInput = ({
  workflowName,
  workflowId,
  selectedTrigger,
}: {
  workflowName: string;
  workflowId?: string;
  selectedTrigger: string;
}) => {
  const [executionInput, setExecutionInput] = useState<string>('');

  const localStorageKey = useMemo(() => {
    if (!workflowName || selectedTrigger !== 'manual') {
      return null;
    }
    const storageIdentifier = workflowId || workflowName;
    return `workflow-${selectedTrigger}-input-${storageIdentifier}`;
  }, [workflowName, workflowId, selectedTrigger]);

  useEffect(() => {
    if (localStorageKey) {
      try {
        const savedInput = localStorage.getItem(localStorageKey);

        if (savedInput) {
          // Return well formatted JSON
          const formattedJson = JSON.stringify(JSON.parse(savedInput), null, 2);
          setExecutionInput(formattedJson);
        }
      } catch (error) {
        // Silently fail if localStorage is not available
      }
    }
  }, [localStorageKey]);

  useEffect(() => {
    if (localStorageKey) {
      try {
        if (executionInput.trim()) {
          // Store minimized JSON
          const minimizedJson = JSON.stringify(JSON.parse(executionInput));
          localStorage.setItem(localStorageKey, minimizedJson);
        } else {
          localStorage.removeItem(localStorageKey);
        }
      } catch (error) {
        // Silently fail if localStorage is not available
      }
    }
  }, [localStorageKey, executionInput]);

  return { executionInput, setExecutionInput };
};
