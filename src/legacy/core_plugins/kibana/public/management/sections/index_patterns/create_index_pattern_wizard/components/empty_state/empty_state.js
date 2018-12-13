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

import {
  EuiCallOut,
  EuiTextColor,
  EuiLink,
  EuiButton,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export const EmptyState = ({
  onRefresh,
}) => (
  <div>
    <EuiCallOut
      color="warning"
      title={
        <FormattedMessage
          id="kbn.management.createIndexPattern.emptyStateHeader"
          defaultMessage="Couldn't find any Elasticsearch data"
        />
      }
    >
      <p>
        <FormattedMessage
          id="kbn.management.createIndexPattern.emptyStateLabel.emptyStateDetail"
          defaultMessage="{needToIndex} {learnHowLink} or {getStartedLink}"
          values={{
            needToIndex: (
              <EuiTextColor color="subdued">
                <FormattedMessage
                  id="kbn.management.createIndexPattern.emptyStateLabel.needToIndexLabel"
                  defaultMessage="You'll need to index some data into Elasticsearch before you can create an index pattern."
                />
              </EuiTextColor>
            ),
            learnHowLink: (
              <EuiLink href="#/home/tutorial_directory">
                <FormattedMessage
                  id="kbn.management.createIndexPattern.emptyStateLabel.learnHowLink"
                  defaultMessage="Learn how"
                />
              </EuiLink>
            ),
            getStartedLink: (
              <EuiLink href="#/home/tutorial_directory/sampleData">
                <FormattedMessage
                  id="kbn.management.createIndexPattern.emptyStateLabel.getStartedLink"
                  defaultMessage="get started with some sample data sets."
                />
              </EuiLink>
            )
          }}
        />
      </p>

      <EuiButton
        iconType="refresh"
        onClick={onRefresh}
        data-test-subj="refreshIndicesButton"
        color="warning"
      >
        <FormattedMessage
          id="kbn.management.createIndexPattern.emptyState.checkDataButton"
          defaultMessage="Check for new data"
        />
      </EuiButton>
    </EuiCallOut>

  </div>
);

EmptyState.propTypes = {
  onRefresh: PropTypes.func.isRequired,
};
