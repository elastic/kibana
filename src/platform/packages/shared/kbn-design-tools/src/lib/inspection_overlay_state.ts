/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';

export type InspectionOverlayKind = 'measure' | 'fontInspect';

let measureOverlayActive = false;
let fontInspectOverlayActive = false;

/** Tracks whether measure or font inspect mode is mounted (no backdrop DOM marker). */
export const isInspectionOverlayActive = (): boolean =>
  measureOverlayActive || fontInspectOverlayActive;

export const setInspectionOverlayActive = (kind: InspectionOverlayKind, active: boolean): void => {
  if (kind === 'measure') {
    measureOverlayActive = active;
    return;
  }
  fontInspectOverlayActive = active;
};

/** Registers an inspection overlay as active for the lifetime of the calling component. */
export const useInspectionOverlayMount = (kind: InspectionOverlayKind): void => {
  useEffect(() => {
    setInspectionOverlayActive(kind, true);
    return () => setInspectionOverlayActive(kind, false);
  }, [kind]);
};
