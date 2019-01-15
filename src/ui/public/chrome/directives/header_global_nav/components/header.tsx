/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import * as Rx from 'rxjs';

import {
  // TODO: add type annotations
  // @ts-ignore
  EuiHeader,
  // @ts-ignore
  EuiHeaderLogo,
  // @ts-ignore
  EuiHeaderSection,
  // @ts-ignore
  EuiHeaderSectionItem,
} from '@elastic/eui';

import { HeaderAppMenu } from './header_app_menu';
import { HeaderBreadcrumbs } from './header_breadcrumbs';
import { HeaderNavControls } from './header_nav_controls';

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { ChromeHeaderNavControlsRegistry } from 'ui/registry/chrome_header_nav_controls';
import { NavControlSide, NavLink } from '../';
import { Breadcrumb } from '../../../../../../core/public/chrome';

interface Props {
  appTitle?: string;
  breadcrumbs$: Rx.Observable<Breadcrumb[]>;
  homeHref: string;
  isVisible: boolean;
  navLinks$: Rx.Observable<NavLink[]>;
  navControls: ChromeHeaderNavControlsRegistry;
  intl: InjectedIntl;
}

class HeaderUI extends Component<Props> {
  public renderLogo() {
    const { homeHref, intl } = this.props;
    return (
      <EuiHeaderLogo
        iconType="logoKibana"
        href={homeHref}
        aria-label={intl.formatMessage({
          id: 'common.ui.chrome.headerGlobalNav.goHomePageIconAriaLabel',
          defaultMessage: 'Go to home page',
        })}
      />
    );
  }

  public render() {
    const { appTitle, breadcrumbs$, isVisible, navControls, navLinks$ } = this.props;

    if (!isVisible) {
      return null;
    }

    const leftNavControls = navControls.bySide[NavControlSide.Left];
    const rightNavControls = navControls.bySide[NavControlSide.Right];

    return (
      <EuiHeader>
        <EuiHeaderSection grow={false}>
          <EuiHeaderSectionItem border="right">{this.renderLogo()}</EuiHeaderSectionItem>

          <HeaderNavControls navControls={leftNavControls} />
        </EuiHeaderSection>

        <HeaderBreadcrumbs appTitle={appTitle} breadcrumbs$={breadcrumbs$} />

        <EuiHeaderSection side="right">
          <HeaderNavControls navControls={rightNavControls} />

          <EuiHeaderSectionItem>
            <HeaderAppMenu navLinks$={navLinks$} />
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
      </EuiHeader>
    );
  }
}

export const Header = injectI18n(HeaderUI);
