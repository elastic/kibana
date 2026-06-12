/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';

import { EuiPageTemplate, type EuiPageTemplateProps } from '@elastic/eui';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { OverlayStart } from '@kbn/core/public';
import { BrowserRouter as Router } from '@kbn/shared-ux-router';

import { FlyoutWithComponent } from './_flyout_with_component';
import { FlyoutWithOverlays } from './_flyout_with_overlays';
import { NonSessionFlyouts } from './_non_session_flyouts';

interface AppDeps {
  basename: string;
  overlays: OverlayStart;
  rendering: RenderingService;
}

type AppContentDeps = Pick<AppDeps, 'overlays' | 'rendering'>;

// Component that uses router hooks (must be inside Router context)
const AppContent: React.FC<AppContentDeps> = ({ overlays, rendering }) => {
  const panelled: EuiPageTemplateProps['panelled'] = undefined;
  const restrictWidth: EuiPageTemplateProps['restrictWidth'] = false;
  const bottomBorder: EuiPageTemplateProps['bottomBorder'] = 'extended';

  // all flyouts share the same history group using a shared `historyKey` object
  const historyKey = useMemo(() => Symbol('flyout-history-group'), []);

  return (
    <EuiPageTemplate
      panelled={panelled}
      restrictWidth={restrictWidth}
      bottomBorder={bottomBorder}
      offset={0}
      grow={false}
    >
      <EuiPageTemplate.Header iconType="logoElastic" pageTitle="Flyout System Example" />

      <EuiPageTemplate.Section grow={false} alignment="top">
        <FlyoutWithComponent historyKey={historyKey} />
      </EuiPageTemplate.Section>

      <EuiPageTemplate.Section grow={false} alignment="top">
        <FlyoutWithOverlays historyKey={historyKey} overlays={overlays} />
      </EuiPageTemplate.Section>

      <EuiPageTemplate.Section grow={false} alignment="top">
        <NonSessionFlyouts overlays={overlays} rendering={rendering} />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

// Main App component that provides Router context
export const App = ({ basename, overlays, rendering }: AppDeps) => {
  return (
    <Router basename={basename}>
      <AppContent overlays={overlays} rendering={rendering} />
    </Router>
  );
};
