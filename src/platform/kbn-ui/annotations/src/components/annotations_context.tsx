/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import type { AnnotationsController, AnnotationsState } from '../state/annotations_controller';
import { useStore } from '../state/store';
import type { Annotation } from '../types';

const AnnotationsContext = createContext<AnnotationsController | null>(null);

export const AnnotationsProvider = ({
  controller,
  children,
}: PropsWithChildren<{ controller: AnnotationsController }>) => (
  <AnnotationsContext.Provider value={controller}>{children}</AnnotationsContext.Provider>
);

export const useAnnotations = (): AnnotationsController => {
  const controller = useContext(AnnotationsContext);
  if (!controller) {
    throw new Error('useAnnotations must be used inside an AnnotationsProvider');
  }
  return controller;
};

export const useAnnotationsState = <S,>(selector: (state: AnnotationsState) => S): S =>
  useStore(useAnnotations().store, selector);

/** Comments made on the current page. */
export const usePageAnnotations = (): Annotation[] => {
  const annotations = useAnnotationsState((state) => state.annotations);
  const pageKey = useAnnotationsState((state) => state.pageKey);
  return useMemo(
    () => annotations.filter((annotation) => annotation.route.pageKey === pageKey),
    [annotations, pageKey]
  );
};
