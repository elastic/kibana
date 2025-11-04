/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiCode, EuiPageTemplate, EuiText, type EuiPageTemplateProps } from '@elastic/eui';
import type { OverlayStart } from '@kbn/core/public';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { BrowserRouter as Router } from '@kbn/shared-ux-router';

import { FlyoutWithOverlays } from './_flyout_with_overlays';
import { FlyoutWithComponent } from './_flyout_with_component';

interface AppDeps {
  basename: string;
  navigation: NavigationPublicPluginStart;
  overlays: OverlayStart;
  rendering: RenderingService;
}

type AppContentDeps = Pick<AppDeps, 'overlays' | 'rendering'>;

// Component that uses router hooks (must be inside Router context)
const AppContent: React.FC<AppContentDeps> = ({ overlays, rendering }) => {
  const panelled: EuiPageTemplateProps['panelled'] = undefined;
  const restrictWidth: EuiPageTemplateProps['restrictWidth'] = false;
  const bottomBorder: EuiPageTemplateProps['bottomBorder'] = 'extended';

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
        <FlyoutWithComponent />
      </EuiPageTemplate.Section>

      <EuiPageTemplate.Section grow={false} alignment="top">
        <FlyoutWithOverlays overlays={overlays} rendering={rendering} />
      </EuiPageTemplate.Section>

      <EuiPageTemplate.Section grow={true} alignment="top">
        <EuiText>
          <p>
            The following filler text is used to test the scroll lock behavior of flyouts that have{' '}
            <EuiCode>{'ownFocus="true"'}</EuiCode>.
          </p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam scelerisque aliquam odio
            et faucibus. Nulla rhoncus feugiat eros quis consectetur. Morbi neque ex, condimentum
            dapibus congue et, vulputate ut ligula. Vestibulum sit amet urna turpis. Mauris euismod
            elit et nisi ultrices, ut faucibus orci tincidunt. Duis a quam nec dui luctus dignissim.
            Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis
            egestas. Integer convallis erat vel felis facilisis, at convallis erat elementum.
          </p>
          <p>
            Aenean ac eleifend lacus, in mollis lectus. Vivamus sodales, augue in facilisis commodo,
            odio augue ornare metus, ut fringilla augue justo vel mi. Morbi vitae diam augue.
            Aliquam vel mauris a nibh auctor commodo. Praesent et nisi eu justo eleifend convallis.
            Quisque suscipit maximus vestibulum. Phasellus congue mollis orci, sit amet luctus augue
            fringilla vel. Curabitur vitae orci nec massa volutpat posuere in sed felis.
            Pellentesque sollicitudin fringilla purus, eu pretium massa euismod eu.
          </p>
        </EuiText>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

// Main App component that provides Router context
export const App = ({ basename, navigation, overlays, rendering }: AppDeps) => {
  return (
    <Router basename={basename}>
      <navigation.ui.TopNavMenu
        appName="flyout_system_example"
        showSearchBar={false}
        useDefaultBehaviors={true}
      />
      <AppContent overlays={overlays} rendering={rendering} />
    </Router>
  );
};
