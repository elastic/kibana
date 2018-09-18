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

import React, {
  Component,
} from 'react';

import {
  EuiHeader,
  EuiHeaderBreadcrumbs,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiHeaderLogo,
} from '@elastic/eui';

import { HeaderAppMenu } from './header_app_menu';
import { HeaderUserMenu } from './header_user_menu';
import { HeaderSpacesMenu } from './header_spaces_menu';

export class Header extends Component {
  constructor(props) {
    super(props);
  }

  renderLogo() {
    return (
      <EuiHeaderLogo iconType="logoKibana" href="/" aria-label="Go to home page" />
    );
  }

  renderBreadcrumbs() {
    const breadcrumbs = [{
      text: 'Management',
      href: '#',
      onClick: (e) => { e.preventDefault(); },
      'data-test-subj': 'breadcrumbsAnimals',
      className: 'customClass',
    }, {
      text: 'Truncation test is here for a really long item',
      href: '#',
      onClick: (e) => { e.preventDefault(); },
    }, {
      text: 'hidden',
      href: '#',
      onClick: (e) => { e.preventDefault(); },
    }, {
      text: 'Users',
      href: '#',
      onClick: (e) => { e.preventDefault(); },
    }, {
      text: 'Create',
    }];

    return (
      <EuiHeaderBreadcrumbs breadcrumbs={breadcrumbs} />
    );
  }

  render() {
    const { navLinks } = this.props;
    return (
      <EuiHeader>
        <EuiHeaderSection>
          <EuiHeaderSectionItem border="right">
            {this.renderLogo()}
          </EuiHeaderSectionItem>

          <EuiHeaderSectionItem border="right">
            <HeaderSpacesMenu />
          </EuiHeaderSectionItem>

          {this.renderBreadcrumbs()}
        </EuiHeaderSection>

        <EuiHeaderSection side="right">
          <EuiHeaderSectionItem>
            <HeaderUserMenu />
          </EuiHeaderSectionItem>

          <EuiHeaderSectionItem>
            <HeaderAppMenu navLinks={navLinks} />
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
      </EuiHeader>
    );
  }
}
