/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface FlyoutMountGuardProps {
  /** Tears the flyout down. Deferred to a task, so the unmount never runs inside a lifecycle. */
  onError: () => void;
  children: ReactNode;
}

/**
 * Releases the flyout when its own frame throws — the content component, or the template above
 * the body zone's `KibanaErrorBoundary`. Without this the caller keeps a live `OverlayRef` for
 * a container whose fallback has no close control.
 *
 * Catching here stops the error reaching the enclosing `KibanaErrorBoundary`, and re-throwing
 * is not an alternative: React skips both `componentDidCatch` and `componentWillUnmount` on a
 * boundary that throws from its error render, leaving nothing able to run the teardown. The
 * error is handed to the global handler instead, which is what APM listens on.
 */
export class FlyoutMountGuard extends Component<FlyoutMountGuardProps, { failed: boolean }> {
  public state = { failed: false };

  public static getDerivedStateFromError() {
    return { failed: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[FlyoutTemplate] Flyout content threw and the flyout was closed.', error, info);
    if (typeof reportError === 'function') {
      reportError(error);
    }
    setTimeout(this.props.onError, 0);
  }

  public render() {
    return this.state.failed ? null : this.props.children;
  }
}
