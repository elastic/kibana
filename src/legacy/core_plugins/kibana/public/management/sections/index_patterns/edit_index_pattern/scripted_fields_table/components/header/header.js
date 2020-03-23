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

import React from 'react';
import PropTypes from 'prop-types';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export const Header = ({ addScriptedFieldUrl }) => (
  <EuiFlexGroup alignItems="center">
    <EuiFlexItem>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="kbn.management.editIndexPattern.scriptedHeader"
            defaultMessage="Scripted fields"
          />
        </h3>
      </EuiTitle>
      <EuiText>
        <p>
          <FormattedMessage
            id="kbn.management.editIndexPattern.scriptedLabel"
            defaultMessage="You can use scripted fields in visualizations and display them in your documents. However, you cannot search
            scripted fields."
          />
        </p>
      </EuiText>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiButton data-test-subj="addScriptedFieldLink" href={addScriptedFieldUrl}>
        <FormattedMessage
          id="kbn.management.editIndexPattern.scripted.addFieldButton"
          defaultMessage="Add scripted field"
        />
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);

Header.propTypes = {
  addScriptedFieldUrl: PropTypes.string.isRequired,
};
