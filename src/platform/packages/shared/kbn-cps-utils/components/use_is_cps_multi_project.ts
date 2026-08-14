/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { ICPSManager } from '../types';

/**
 * `true` when cross-project search is live and the origin project has at least one linked
 * project. Use it to gate UI that only makes sense when there is more than one project to talk
 * about, such as project columns, scope pickers, and copy disclosing cross-project behavior.
 *
 * Pass `undefined` when the CPS plugin is unavailable (it is an optional dependency for most
 * consumers); the hook then reports `false`.
 *
 * Two details this centralizes, both easy to get wrong when inlined:
 *
 * - `hasLinkedProjects()` only reflects data fetched during `whenReady()`, so reading it
 *   synchronously during the first render returns `false` even in a multi-project deployment.
 *   This awaits readiness and stores the result so the caller re-renders once CPS is ready.
 * - `hasLinkedProjects()` is preferred over `getTotalProjectCount() > 1`. The count includes the
 *   origin project, so the two disagree when the origin is absent but a linked project is
 *   present. What callers actually mean is "is there anything to cross-project search into",
 *   which is the linked-project check.
 */
export const useIsCpsMultiProject = (cpsManager?: ICPSManager): boolean => {
  const [isCpsMultiProject, setIsCpsMultiProject] = useState(false);

  useEffect(() => {
    if (!cpsManager) {
      setIsCpsMultiProject(false);
      return;
    }

    let isMounted = true;

    const resolveLinkedProjects = async () => {
      try {
        await cpsManager.whenReady();
        if (isMounted) {
          setIsCpsMultiProject(cpsManager.hasLinkedProjects());
        }
      } catch {
        if (isMounted) {
          setIsCpsMultiProject(false);
        }
      }
    };

    resolveLinkedProjects();

    return () => {
      isMounted = false;
    };
  }, [cpsManager]);

  return isCpsMultiProject;
};
