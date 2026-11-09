/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
import { FeatureFlagsFloatingButton } from './floating_button';
import {
  FEATURE_FLAGS_HELPER_TITLE_ID,
  FlagsFlyout,
  type FeatureFlagsHelperHttp,
} from './flags_flyout';

/** Dispatched by the developer toolbar when its feature flags helper setting changes. */
const FEATURE_FLAGS_HELPER_TOOLBAR_CHANGE = 'feature-flags-helper-toolbar-change';
export interface MountFeatureFlagsHelperDeps {
  http: FeatureFlagsHelperHttp;
  overlays: Pick<OverlayStart, 'openFlyout'>;
  rendering: Pick<RenderingService, 'addContext'>;
  refreshFlags: () => Promise<void>;
  getBrowserEvaluations: () => Array<{ key: string; value: unknown }>;
}

/** Mounts the helper. The flyout is opened through the overlays service. */
export function mountFeatureFlagsHelper(deps: MountFeatureFlagsHelperDeps): {
  unmount: () => void;
  open: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let open = () => {};
  flushSync(() => {
    root.render(
      deps.rendering.addContext(
        <FeatureFlagsHelper
          http={deps.http}
          overlays={deps.overlays}
          rendering={deps.rendering}
          refreshFlags={deps.refreshFlags}
          getBrowserEvaluations={deps.getBrowserEvaluations}
          bindOpen={(next) => {
            open = next;
          }}
        />
      )
    );
  });
  return {
    open: () => open(),
    unmount: () => {
      root.unmount();
      container.remove();
    },
  };
}

function FeatureFlagsHelper({
  http,
  overlays,
  rendering,
  refreshFlags,
  getBrowserEvaluations,
  bindOpen,
}: MountFeatureFlagsHelperDeps & { bindOpen: (open: () => void) => void }) {
  const flyoutRef = useRef<OverlayRef | undefined>(undefined);
  const [inToolbar, setInToolbar] = useState(() => globalThis.featureFlagsHelperInToolbar === true);
  useEffect(() => {
    const sync = () => setInToolbar(globalThis.featureFlagsHelperInToolbar === true);
    window.addEventListener(FEATURE_FLAGS_HELPER_TOOLBAR_CHANGE, sync);
    return () => window.removeEventListener(FEATURE_FLAGS_HELPER_TOOLBAR_CHANGE, sync);
  }, []);

  useEffect(() => {
    return () => {
      flyoutRef.current?.close();
      flyoutRef.current = undefined;
    };
  }, []);

  const toggleFlyout = () => {
    if (flyoutRef.current) {
      flyoutRef.current.close();
      flyoutRef.current = undefined;
      return;
    }

    const flyout = overlays.openFlyout(
      (element) => {
        const flyoutRoot = createRoot(element);
        flyoutRoot.render(
          rendering.addContext(
            <FlagsFlyout
              http={http}
              refreshFlags={refreshFlags}
              getBrowserEvaluations={getBrowserEvaluations}
              onClose={() => flyout.close()}
            />
          )
        );
        return () => flyoutRoot.unmount();
      },
      {
        size: Math.max(720, Math.round(window.innerWidth * 0.7)),
        ownFocus: true,
        resizable: true,
        session: 'never',
        'aria-labelledby': FEATURE_FLAGS_HELPER_TITLE_ID,
        onClose: (ref) => {
          if (flyoutRef.current === ref) {
            flyoutRef.current = undefined;
          }
          ref.close();
        },
      }
    );
    flyout.onClose.then(() => {
      if (flyoutRef.current === flyout) {
        flyoutRef.current = undefined;
      }
    });
    flyoutRef.current = flyout;
  };
  const toggleRef = useRef(toggleFlyout);
  toggleRef.current = toggleFlyout;
  useLayoutEffect(() => {
    bindOpen(() => toggleRef.current());
  }, [bindOpen]);

  // The toolbar pill is the button while that toolbar item stays enabled.
  if (inToolbar) {
    return null;
  }
  return <FeatureFlagsFloatingButton onClick={toggleFlyout} />;
}
