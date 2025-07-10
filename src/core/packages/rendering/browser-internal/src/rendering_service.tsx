/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject, pairwise, startWith } from 'rxjs';

import { EuiLoadingSpinner } from '@elastic/eui';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import type { ExecutionContextStart } from '@kbn/core-execution-context-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaRootContextProvider } from '@kbn/react-kibana-context-root';
import { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
import { RenderingService as IRenderingService } from '@kbn/core-rendering-browser';
import {
  LayoutService,
  LayoutFeatureFlag,
  LAYOUT_FEATURE_FLAG_KEY,
  LAYOUT_DEBUG_FEATURE_FLAG_KEY,
} from '@kbn/core-chrome-layout';
import { GridLayout } from '@kbn/core-chrome-layout/layouts/grid';
import { LegacyFixedLayout } from '@kbn/core-chrome-layout/layouts/legacy-fixed';

export interface RenderingServiceContextDeps {
  analytics: AnalyticsServiceStart;
  executionContext: ExecutionContextStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
}

export interface RenderingServiceRenderCoreDeps {
  application: InternalApplicationStart;
  chrome: InternalChromeStart;
  overlays: OverlayStart;
  featureFlags: FeatureFlagsStart;
}

export interface RenderingServiceInternalStart extends IRenderingService {
  renderCore: (
    renderCoreDeps: RenderingServiceRenderCoreDeps,
    targetDomElement: HTMLDivElement
  ) => void;
}

/**
 * Renders all Core UI in a single React tree.
 *
 * @internalRemarks Currently this only renders Chrome UI. Notifications and
 * Overlays UI should be moved here as well.
 *
 * @internal
 */
export class RenderingService implements IRenderingService {
  private contextDeps = new BehaviorSubject<RenderingServiceContextDeps | null>(null);

  /**
   * @internal
   */
  public start(deps: RenderingServiceContextDeps): RenderingServiceInternalStart {
    this.contextDeps.next(deps);

    const contract = {
      renderCore: this.renderCore.bind(this),
      addContext: this.addContext.bind(this),
    };
    return contract;
  }

  /**
   * @internal
   */
  public renderCore(
    renderCoreDeps: RenderingServiceRenderCoreDeps,
    targetDomElement: HTMLDivElement
  ) {
    const { chrome, featureFlags } = renderCoreDeps;
    const layoutType = featureFlags.getStringValue<LayoutFeatureFlag>(
      LAYOUT_FEATURE_FLAG_KEY,
      'legacy-fixed'
    );
    const debugLayout = featureFlags.getBooleanValue(LAYOUT_DEBUG_FEATURE_FLAG_KEY, false);

    const startServices = this.contextDeps.getValue()!;

    const body = document.querySelector('body')!;
    chrome
      .getBodyClasses$()
      .pipe(startWith<string[]>([]), pairwise())
      .subscribe(([previousClasses, newClasses]) => {
        body.classList.remove(...previousClasses);
        body.classList.add(...newClasses);
      });

    const layout: LayoutService =
      layoutType === 'grid'
        ? new GridLayout(renderCoreDeps, { debug: debugLayout })
        : new LegacyFixedLayout(renderCoreDeps);

    const Layout = layout.getComponent();

    ReactDOM.render(
      <KibanaRootContextProvider {...startServices} globalStyles={true}>
        <Layout />
      </KibanaRootContextProvider>,
      targetDomElement
    );
  }

  /**
   * @public
   */
  public addContext(element: React.ReactNode): React.ReactElement<string> {
    const Component: React.FC = () => {
      /**
       * The dependencies are captured using BehaviorSubject, because we assume that Kibana plugins' start
       * methods could be called before the CoreStart services are completely settled internally. If this
       * assumption is wrong, the available dependencies are given as the initial value to `useObservable`, and
       * there is no unnecessary re-render.
       */
      const deps = useObservable(this.contextDeps, this.contextDeps.getValue());

      if (!deps) {
        return <EuiLoadingSpinner size="s" />;
      }

      return (
        <KibanaRenderContextProvider
          analytics={deps.analytics}
          executionContext={deps.executionContext}
          i18n={deps.i18n}
          theme={deps.theme}
          userProfile={deps.userProfile}
        >
          {element}
        </KibanaRenderContextProvider>
      );
    };

    return <Component />;
  }
}
