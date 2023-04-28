/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Router } from 'react-router-dom';
import { EuiHeader, EuiHeaderLogo, EuiHeaderSection, EuiHeaderSectionItem } from '@elastic/eui';
import {
  ChromeBreadcrumb,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeNavControl,
} from '@kbn/core-chrome-browser/src';
import { Observable } from 'rxjs';
import { MountPoint } from '@kbn/core-mount-utils-browser';
import { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import { HeaderBreadcrumbs } from '../header/header_breadcrumbs';
import { HeaderActionMenu } from '../header/header_action_menu';
import { HeaderHelpMenu } from '../header/header_help_menu';
import { HeaderNavControls } from '../header/header_nav_controls';
import { ProjectNavigation } from './navigation';

interface Props {
  breadcrumbs$: Observable<ChromeBreadcrumb[]>;
  actionMenu$: Observable<MountPoint | undefined>;
  kibanaDocLink: string;
  globalHelpExtensionMenuLinks$: Observable<ChromeGlobalHelpExtensionMenuLink[]>;
  helpExtension$: Observable<ChromeHelpExtension | undefined>;
  helpSupportUrl$: Observable<string>;
  kibanaVersion: string;
  application: InternalApplicationStart;
  navControlsRight$: Observable<ChromeNavControl[]>;
}

export const ProjectHeader = ({
  application,
  kibanaDocLink,
  kibanaVersion,
  ...observables
}: Props) => {
  const renderLogo = () => (
    <EuiHeaderLogo
      iconType="logoElastic"
      href="#"
      onClick={(e) => e.preventDefault()}
      aria-label="Go to home page"
    />
  );

  return (
    <>
      <EuiHeader position="fixed">
        <EuiHeaderSection grow={false}>
          <EuiHeaderSectionItem border="right">{renderLogo()}</EuiHeaderSectionItem>
          <EuiHeaderSectionItem>
            <HeaderBreadcrumbs breadcrumbs$={observables.breadcrumbs$} />
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
        <EuiHeaderSection side="right">
          <EuiHeaderSectionItem>
            <HeaderHelpMenu
              globalHelpExtensionMenuLinks$={observables.globalHelpExtensionMenuLinks$}
              helpExtension$={observables.helpExtension$}
              helpSupportUrl$={observables.helpSupportUrl$}
              kibanaDocLink={kibanaDocLink}
              kibanaVersion={kibanaVersion}
              navigateToUrl={application.navigateToUrl}
            />
          </EuiHeaderSectionItem>
          <EuiHeaderSectionItem border="left">
            <HeaderActionMenu actionMenu$={observables.actionMenu$} />
          </EuiHeaderSectionItem>

          <EuiHeaderSectionItem>
            <HeaderNavControls navControls$={observables.navControlsRight$} />
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
      </EuiHeader>
      <Router history={application.history}>
        <ProjectNavigation>
          <span />
        </ProjectNavigation>
      </Router>
    </>
  );
};
