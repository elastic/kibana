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

import * as React from 'react';
import { EuiPage, EuiPageBody } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n/react';
import { SidebarNav } from './components';
import { LegacySection } from './types';
import { ManagementSection } from './management_section';

interface Props {
  sections: ManagementSection[];
  legacySections: LegacySection[];
  selectedId: string;
  mountedCallback: (element: HTMLDivElement) => void;
}

export class ManagementChrome extends React.Component<Props> {
  private container = React.createRef<HTMLDivElement>();
  componentDidMount() {
    if (this.container.current) {
      this.props.mountedCallback(this.container.current);
    }
  }
  render() {
    return (
      <I18nProvider>
        <EuiPage>
          <SidebarNav
            sections={this.props.sections}
            legacySections={this.props.legacySections}
            selectedId={this.props.selectedId}
          />
          <EuiPageBody>
            <div ref={this.container} />
          </EuiPageBody>
        </EuiPage>
      </I18nProvider>
    );
  }
}
