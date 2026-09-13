/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { FlyoutTemplateProps } from '../types';

/**
 * Supplied by an opener that owns the flyout's lifecycle.
 *
 * Under it, `FlyoutTemplate` takes every root prop from `props` and ignores its own, so the
 * `id` and `session` the opener's bookkeeping matches on cannot be contradicted from inside
 * the subtree. `onClose` stays the element's own, sourced from `useFlyoutClose`, so the
 * declarative contract can keep requiring it.
 */
export interface FlyoutTemplateManaged {
  /** Resolved root props; `children` and `onClose` still come from the `FlyoutTemplate` element. */
  props: Omit<FlyoutTemplateProps, 'children' | 'onClose'>;
  /** Dismisses the flyout exactly as the close button does. */
  close: () => void;
}

const FlyoutTemplateManagedContext = createContext<FlyoutTemplateManaged | null>(null);

/** @internal Wraps managed flyout content. Not for use by flyout authors. */
export const FlyoutTemplateManagedProvider = ({
  value,
  children,
}: {
  value: FlyoutTemplateManaged;
  children: ReactNode;
}) => (
  <FlyoutTemplateManagedContext.Provider value={value}>
    {children}
  </FlyoutTemplateManagedContext.Provider>
);

/** @internal Returns the managing opener's contract, or `null` when the template owns itself. */
export const useFlyoutTemplateManaged = (): FlyoutTemplateManaged | null =>
  useContext(FlyoutTemplateManagedContext);

/**
 * Dismisses the flyout from anywhere inside managed content, without threading a ref down.
 *
 * A `FlyoutTemplate` rendered directly in a React tree is closed by whatever owns its
 * `onClose`, so there is nothing for this hook to return and it throws.
 */
export const useFlyoutClose = (): (() => void) => {
  const managed = useContext(FlyoutTemplateManagedContext);
  if (!managed) {
    throw new Error(
      '[FlyoutTemplate] useFlyoutClose() is only available inside a managed flyout. A <FlyoutTemplate> rendered directly owns its own close handler.'
    );
  }
  return managed.close;
};
