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
 * `true` once cross-project search is ready and has at least one linked project, `false` once
 * ready with none (or when `cpsManager` isn't provided), and `undefined` while readiness is
 * still pending. Use it to gate UI that only makes sense with more than one project, e.g. scope
 * pickers or cross-project copy; treat it as falsy if you don't need to distinguish "not yet
 * known" from "no linked projects".
 *
 * Waits for `cpsManager.whenReady()` before reading `hasLinkedProjects()`, since reading it
 * synchronously on first render would report `false` even in a multi-project deployment.
 */
export const useIsCpsMultiProject = (cpsManager?: ICPSManager): boolean | undefined => {
  const [hasLinkedProjects, setHasLinkedProjects] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!cpsManager) {
      return;
    }

    let isMounted = true;
    // No-op on mount, but resets to pending when the manager itself changes.
    setHasLinkedProjects(undefined);

    cpsManager
      .whenReady()
      .then(() => {
        if (isMounted) {
          setHasLinkedProjects(cpsManager.hasLinkedProjects());
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasLinkedProjects(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [cpsManager]);

  // Derived rather than stored, so the no-manager case never sets state and never costs a render.
  return cpsManager ? hasLinkedProjects : false;
};
