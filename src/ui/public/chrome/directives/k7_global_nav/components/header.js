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
    const { appTitle } = this.props;

    if (!appTitle) {
      return null;
    }

    const breadcrumbs = [{
      text: appTitle
    }];

    return (
      <EuiHeaderBreadcrumbs breadcrumbs={breadcrumbs} />
    );
  }

  renderControls() {
    const { navControls } = this.props;

    return navControls && navControls.map(navControl => (
      <EuiHeaderSectionItem key={navControl.name}>
        {navControl.render()}
      </EuiHeaderSectionItem>
    ));
  }

  render() {
    const { navLinks, isVisible } = this.props;

    if (!isVisible) {
      return null;
    }

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
          {this.renderControls()}

          <EuiHeaderSectionItem>
            <HeaderAppMenu navLinks={navLinks} />
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
      </EuiHeader>
    );
  }
}
