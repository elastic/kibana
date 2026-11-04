/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
import { FeatureFlagsFloatingButton } from './floating_button';
import {
  FEATURE_FLAGS_HELPER_TITLE_ID,
  FlagsFlyout,
  type FeatureFlagsHelperHttp,
} from './flags_flyout';
export interface MountFeatureFlagsHelperDeps {
  http: FeatureFlagsHelperHttp;
  overlays: Pick<OverlayStart, 'openFlyout'>;
  rendering: Pick<RenderingService, 'addContext'>;
  refreshFlags: () => Promise<void>;
  getBrowserEvaluations: () => Array<{ key: string; value: unknown }>;
}

/** Mounts the corner button. The flyout itself is opened through the overlays service. */
export function mountFeatureFlagsHelper(deps: MountFeatureFlagsHelperDeps): {
  unmount: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    deps.rendering.addContext(
      <FeatureFlagsHelper
        http={deps.http}
        overlays={deps.overlays}
        rendering={deps.rendering}
        refreshFlags={deps.refreshFlags}
        getBrowserEvaluations={deps.getBrowserEvaluations}
      />
    )
  );
  return {
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
}: MountFeatureFlagsHelperDeps) {
  const flyoutRef = useRef<OverlayRef | undefined>(undefined);

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

  return <FeatureFlagsFloatingButton onClick={toggleFlyout} />;
}
