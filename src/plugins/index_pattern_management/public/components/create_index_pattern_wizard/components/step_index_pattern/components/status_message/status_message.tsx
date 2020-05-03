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

import { EuiText, EuiTextColor, EuiIcon } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { MatchedIndex } from '../../../../types';

interface StatusMessageProps {
  matchedIndices: {
    allIndices: MatchedIndex[];
    exactMatchedIndices: MatchedIndex[];
    partialMatchedIndices: MatchedIndex[];
  };
  isIncludingSystemIndices: boolean;
  query: string;
  showSystemIndices: boolean;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({
  matchedIndices: { allIndices = [], exactMatchedIndices = [], partialMatchedIndices = [] },
  isIncludingSystemIndices,
  query,
  showSystemIndices,
}) => {
  let statusIcon;
  let statusMessage;
  let statusColor: 'default' | 'secondary' | undefined;

  const allIndicesLength = allIndices.length;

  if (query.length === 0) {
    statusIcon = null;
    statusColor = 'default';

    if (allIndicesLength > 1) {
      statusMessage = (
        <span>
          <FormattedMessage
            id="kbn.management.createIndexPattern.step.status.matchAnyLabel.matchAnyDetail"
            defaultMessage="Your index pattern can match any of your {strongIndices}, below."
            values={{ strongIndices: <strong>{allIndicesLength} indices</strong> }}
          />
        </span>
      );
    } else if (!isIncludingSystemIndices && showSystemIndices) {
      statusMessage = (
        <span>
          <FormattedMessage
            id="kbn.management.createIndexPattern.step.status.noSystemIndicesWithPromptLabel"
            defaultMessage="No Elasticsearch indices match your pattern. To view the matching system indices, toggle the switch in
            the upper right."
          />
        </span>
      );
    } else {
      statusMessage = (
        <span>
          <FormattedMessage
            id="kbn.management.createIndexPattern.step.status.noSystemIndicesLabel"
            defaultMessage="No Elasticsearch indices match your pattern."
          />
        </span>
      );
    }
  } else if (exactMatchedIndices.length) {
    statusIcon = 'check';
    statusColor = 'secondary';
    statusMessage = (
      <span>
        &nbsp;
        <FormattedMessage
          id="kbn.management.createIndexPattern.step.status.successLabel.successDetail"
          defaultMessage="{strongSuccess} Your index pattern matches {strongIndices}."
          values={{
            strongSuccess: (
              <strong>
                <FormattedMessage
                  id="kbn.management.createIndexPattern.step.status.successLabel.strongSuccessLabel"
                  defaultMessage="Success!"
                />
              </strong>
            ),
            strongIndices: (
              <strong>
                <FormattedMessage
                  id="kbn.management.createIndexPattern.step.status.successLabel.strongIndicesLabel"
                  defaultMessage="{indicesLength, plural, one {# index} other {# indices}}"
                  values={{ indicesLength: exactMatchedIndices.length }}
                />
              </strong>
            ),
          }}
        />
      </span>
    );
  } else if (partialMatchedIndices.length) {
    statusIcon = null;
    statusColor = 'default';
    statusMessage = (
      <span>
        <FormattedMessage
          id="kbn.management.createIndexPattern.step.status.partialMatchLabel.partialMatchDetail"
          defaultMessage="Your index pattern doesn't match any indices, but you have {strongIndices} which
          {matchedIndicesLength, plural, one {looks} other {look}} similar."
          values={{
            matchedIndicesLength: partialMatchedIndices.length,
            strongIndices: (
              <strong>
                <FormattedMessage
                  id="kbn.management.createIndexPattern.step.status.partialMatchLabel.strongIndicesLabel"
                  defaultMessage="{matchedIndicesLength, plural, one {# index} other {# indices}}"
                  values={{ matchedIndicesLength: partialMatchedIndices.length }}
                />
              </strong>
            ),
          }}
        />
      </span>
    );
  } else if (allIndicesLength) {
    statusIcon = null;
    statusColor = 'default';
    statusMessage = (
      <span>
        <FormattedMessage
          id="kbn.management.createIndexPattern.step.status.notMatchLabel.notMatchDetail"
          defaultMessage="The index pattern you've entered doesn't match any indices.
          You can match {indicesLength, plural, one {your} other {any of your}} {strongIndices}, below."
          values={{
            strongIndices: (
              <strong>
                <FormattedMessage
                  id="kbn.management.createIndexPattern.step.status.notMatchLabel.allIndicesLabel"
                  defaultMessage="{indicesLength, plural, one {# index} other {# indices}}"
                  values={{ indicesLength: allIndicesLength }}
                />
              </strong>
            ),
            indicesLength: allIndicesLength,
          }}
        />
      </span>
    );
  }

  return (
    <EuiText size="s" data-test-subj="createIndexPatternStatusMessage">
      <EuiTextColor color={statusColor}>
        {statusIcon ? <EuiIcon type={statusIcon} /> : null}
        {statusMessage}
      </EuiTextColor>
    </EuiText>
  );
};
