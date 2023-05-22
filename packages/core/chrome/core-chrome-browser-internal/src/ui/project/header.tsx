/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createRef, useState } from 'react';
import { Router } from 'react-router-dom';
import {
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  htmlIdGenerator,
} from '@elastic/eui';
import {
  ChromeBreadcrumb,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeNavControl,
} from '@kbn/core-chrome-browser/src';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { i18n } from '@kbn/i18n';
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
  children: React.ReactNode;
}

const LOCAL_STORAGE_IS_OPEN_KEY = 'PROJECT_NAVIGATION_OPEN' as const;

export const ProjectHeader = ({
  application,
  kibanaDocLink,
  kibanaVersion,
  children,
  ...observables
}: Props) => {
  const [navId] = useState(htmlIdGenerator()());
  const [isOpen, setIsOpen] = useLocalStorage(LOCAL_STORAGE_IS_OPEN_KEY, true);
  const toggleCollapsibleNavRef = createRef<HTMLButtonElement & { euiAnimate: () => void }>();

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
      <EuiHeader position="fixed" data-test-subj="kibanaProjectHeader">
        <EuiHeaderSection grow={false}>
          <EuiHeaderSectionItem border="right">
            <Router history={application.history}>
              <ProjectNavigation
                isOpen={isOpen!}
                closeNav={() => {
                  setIsOpen(false);
                  if (toggleCollapsibleNavRef.current) {
                    toggleCollapsibleNavRef.current.focus();
                  }
                }}
                button={
                  <EuiHeaderSectionItemButton
                    data-test-subj="toggleNavButton"
                    aria-label={i18n.translate('core.ui.primaryNav.toggleNavAriaLabel', {
                      defaultMessage: 'Toggle primary navigation',
                    })}
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen!}
                    aria-pressed={isOpen!}
                    aria-controls={navId}
                    ref={toggleCollapsibleNavRef}
                  >
                    <EuiIcon type={isOpen ? 'menuLeft' : 'menuRight'} size="m" />
                  </EuiHeaderSectionItemButton>
                }
              >
                {children}
              </ProjectNavigation>
            </Router>
          </EuiHeaderSectionItem>
          <EuiHeaderSectionItem>{renderLogo()}</EuiHeaderSectionItem>
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
    </>
  );
};
