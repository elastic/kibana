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

import React, { Fragment, PureComponent } from 'react';
import { EuiButton, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

export class HelpMenu extends PureComponent {
  render() {
    return (
      <Fragment>
        <EuiHorizontalRule margin="none" />
        <EuiSpacer />
        <EuiButton
          fill
          iconType="popout"
          href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/discover.html`}
          target="_blank"
        >
          <FormattedMessage id="kbn.discover.helpMenu.docLabel" defaultMessage="Discover documentation" />
        </EuiButton>
      </Fragment>
    );
  }
}
