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

import React, { PureComponent } from 'react';
import { EuiButton, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';

export class HelpMenu extends PureComponent {
  render() {
    return (
      <I18nProvider>
        <>
          <EuiHorizontalRule margin="none" />
          <EuiSpacer />
          <EuiButton
            fill
            iconType="popout"
            href={`${this.props.docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${this.props.docLinks.DOC_LINK_VERSION}/dashboard.html`}
            target="_blank"
          >
            <FormattedMessage
              id="kbn.dashboard.helpMenu.docLabel"
              defaultMessage="Dashboard documentation"
            />
          </EuiButton>
        </>
      </I18nProvider>
    );
  }
}
