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
 * `hasLinkedProjects()` reports `false` until `whenReady()` resolves, so only a `true` reading is
 * conclusive before then; a `false` one still means "not yet known".
 */
const readIsCpsMultiProject = (cpsManager?: ICPSManager): boolean | undefined =>
  cpsManager ? cpsManager.hasLinkedProjects() || undefined : false;

/**
 * `true` once cross-project search is ready and has at least one linked project, `false` once
 * ready with none (or when `cpsManager` isn't provided), and `undefined` while readiness is
 * still pending. Use it to gate UI that only makes sense with more than one project, e.g. scope
 * pickers or cross-project copy; treat it as falsy if you don't need to distinguish "not yet
 * known" from "no linked projects".
 *
 * A manager that already reports linked projects answers `true` on the first render, so callers
 * gating a column or panel on it don't shift layout after paint. Every other answer waits for
 * `cpsManager.whenReady()`, since `hasLinkedProjects()` reports `false` until then even in a
 * multi-project deployment.
 */
export const useIsCpsMultiProject = (cpsManager?: ICPSManager): boolean | undefined => {
  const [isCpsMultiProject, setIsCpsMultiProject] = useState<boolean | undefined>(() =>
    readIsCpsMultiProject(cpsManager)
  );

  useEffect(() => {
    setIsCpsMultiProject(readIsCpsMultiProject(cpsManager));

    if (!cpsManager) {
      return;
    }

    let isMounted = true;

    cpsManager
      .whenReady()
      .then(() => {
        if (isMounted) {
          setIsCpsMultiProject(cpsManager.hasLinkedProjects());
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsCpsMultiProject(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [cpsManager]);

  return isCpsMultiProject;
};
