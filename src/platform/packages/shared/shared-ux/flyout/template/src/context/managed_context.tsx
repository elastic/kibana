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
 * Injected by the opener to manage the flyout's lifecycle.
 *
 * FlyoutTemplate ignores its own root props and uses these instead, preventing
 * the subtree from overriding critical state like `id` and `session`.
 * `onClose` is kept separate to fulfill the declarative contract.
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
 * Closes the flyout from anywhere inside it without needing to pass a ref down.
 *
 * Throws an error if used outside a managed flyout, as standard flyouts
 * are closed by whatever owns their `onClose` handler.
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
