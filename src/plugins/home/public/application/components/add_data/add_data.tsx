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

import React, { FC } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  sampleData?: FeatureCatalogueEntry;
  cards?: JSX.Element[];
}

export const AddData: FC<Props> = ({ sampleData, cards }) => (
  <div className="homAddData">
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline" responsive={false}>
      <EuiFlexItem grow={1}>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage id="home.addData.sectionTitle" defaultMessage="Add your data" />
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      {sampleData ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType={sampleData.icon} href={sampleData.path} size="xs" flush="right">
            <FormattedMessage
              id="home.addData.sampleDataButtonLabel"
              defaultMessage="Try our sample data"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>

    <EuiSpacer />

    <EuiFlexGroup justifyContent="spaceAround">{cards}</EuiFlexGroup>
  </div>
);
