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
 * `true` once cross-project search is ready and has at least one linked project. Use it to gate
 * UI that only makes sense with more than one project, e.g. scope pickers or cross-project copy.
 *
 * Waits for `cpsManager.whenReady()` before reading `hasLinkedProjects()`, since reading it
 * synchronously on first render would report `false` even in a multi-project deployment.
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
