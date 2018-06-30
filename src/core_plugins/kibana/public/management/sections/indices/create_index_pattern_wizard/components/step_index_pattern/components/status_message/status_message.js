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

import {
  EuiText,
  EuiTextColor,
  EuiIcon,
} from '@elastic/eui';

import { ReactI18n } from '@kbn/i18n';

const { FormattedMessage } = ReactI18n;

export const StatusMessage = ({
  matchedIndices: {
    allIndices = [],
    exactMatchedIndices = [],
    partialMatchedIndices = []
  },
  isIncludingSystemIndices,
  query,
}) => {
  let statusIcon;
  let statusMessage;
  let statusColor;

  if (query.length === 0) {
    statusIcon = null;
    statusColor = 'default';

    if (allIndices.length > 1) {
      statusMessage = (
        <span>
          <FormattedMessage
            id="kbn.management.indexPattern.create.step.status.matchAny.label.detail"
            defaultMessage="Your index pattern can match any of your {strongIndices}, below."
            values={{ strongIndices: (
              <strong><FormattedMessage
                id="kbn.management.indexPattern.create.step.status.matchAny.label.strongIndices"
                defaultMessage="{allIndicesLength, plural, one {# index} other {# indices}}"
                values={{ allIndicesLength: allIndices.length }}
              />
              </strong>) }}
          />
        </span>
      );
    }
    else if (!isIncludingSystemIndices) {
      statusMessage = (
        <span>
          <FormattedMessage
            id="kbn.management.indexPattern.create.step.status.noSystemIndicesWithPrompt.label"
            //eslint-disable-next-line max-len
            defaultMessage="No Elasticsearch indices match your pattern. To view the matching system indices, toggle the switch in the upper right."
          />
        </span>
      );
    }
    else {
      // This should never really happen but let's handle it just in case
      statusMessage = (
        <span>
          <FormattedMessage
            id="kbn.management.indexPattern.create.step.status.noSystemIndices.label"
            defaultMessage="No Elasticsearch indices match your pattern."
          />
        </span>
      );
    }
  }
  else if (exactMatchedIndices.length) {
    statusIcon = 'check';
    statusColor = 'secondary';
    statusMessage = (
      <span>
        &nbsp;
        <FormattedMessage
          id="kbn.management.indexPattern.create.step.status.success.label.detail"
          defaultMessage="{strongSuccess} Your index pattern matches {strongIndices}."
          values={{
            strongSuccess: (
              <strong>
                <FormattedMessage
                  id="kbn.management.indexPattern.create.step.status.success.label.strongSuccess"
                  defaultMessage="Success!"
                />
              </strong>),
            strongIndices: (
              <strong>
                <FormattedMessage
                  id="kbn.management.indexPattern.create.step.status.success.label.strongIndices"
                  defaultMessage="{indicesLength, plural, one {# index} other {# indices}}"
                  values={{ indicesLength: exactMatchedIndices.length }}
                />
              </strong>)
          }}
        />
      </span>
    );
  }
  else if (partialMatchedIndices.length) {
    statusIcon = null;
    statusColor = 'default';
    statusMessage = (
      <span>
        <FormattedMessage
          id="kbn.management.indexPattern.create.step.status.partialMatch.label.detail"
          //eslint-disable-next-line max-len
          defaultMessage="Your index pattern doesn't match any indices, but you have {strongIndices} which {matchedIndicesLength, plural, one {looks} other {look}} similar."
          values={{
            matchedIndicesLength: partialMatchedIndices.length,
            strongIndices: (
              <strong><FormattedMessage
                id="kbn.management.indexPattern.create.step.status.partialMatch.label.strongIndices"
                defaultMessage="{matchedIndicesLength, plural, one {# index} other {# indices}}"
                values={{ matchedIndicesLength: partialMatchedIndices.length }}
              />
              </strong>)
          }}
        />
      </span>
    );
  }
  else if (allIndices.length) {
    statusIcon = null;
    statusColor = 'default';
    statusMessage = (
      <span>
        <FormattedMessage
          id="kbn.management.indexPattern.create.step.status.notMatch.label.detail"
          defaultMessage="The index pattern you've entered doesn't match any indices. You can match any of your {strongIndices}, below."
          values={{ strongIndices: (
            <strong><FormattedMessage
              id="kbn.management.indexPattern.create.step.status.notMatch.label.allIndices"
              defaultMessage="{indicesLength, plural, one {# index} other {# indices}}"
              values={{ indicesLength: allIndices.length }}
            />
            </strong>) }}
        />
      </span>
    );
  }

  return (
    <EuiText size="s">
      <EuiTextColor color={statusColor}>
        { statusIcon ? <EuiIcon type={statusIcon}/> : null }
        {statusMessage}
      </EuiTextColor>
    </EuiText>
  );
};
