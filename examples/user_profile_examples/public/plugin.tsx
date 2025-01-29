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
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { AvatarDemo } from './avatar_demo';
import { PopoverDemo } from './popover_demo';
import { SelectableDemo } from './selectable_demo';
import { ToolTipDemo } from './tooltip_demo';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  security: SecurityPluginSetup;
}

interface StartDeps {
  security: SecurityPluginStart;
}

export class UserProfilesPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, deps: SetupDeps) {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'userProfileExamples',
      title: 'User profile components',
      async mount({ element }: AppMountParameters) {
        // Fetch user suggestions
        // const [, depsStart] = await core.getStartServices();
        // depsStart.security.userProfiles.suggest('/internal/user_profiles_examples/_suggest', {
        //   name: 'a',
        // });

        ReactDOM.render(
          <KibanaPageTemplate>
            <KibanaPageTemplate.Header pageTitle="User profile components" />
            <KibanaPageTemplate.Section>
              <AvatarDemo />
            </KibanaPageTemplate.Section>
            <KibanaPageTemplate.Section>
              <ToolTipDemo />
            </KibanaPageTemplate.Section>
            <KibanaPageTemplate.Section>
              <SelectableDemo />
            </KibanaPageTemplate.Section>
            <KibanaPageTemplate.Section>
              <PopoverDemo />
            </KibanaPageTemplate.Section>
          </KibanaPageTemplate>,
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    deps.developerExamples.register({
      appId: 'userProfileExamples',
      title: 'User Profile',
      description: 'Demo of how to implement a suggest user functionality',
    });
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
