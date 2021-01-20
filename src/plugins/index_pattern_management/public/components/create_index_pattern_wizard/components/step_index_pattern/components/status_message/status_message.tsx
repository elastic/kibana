/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';

import { FormattedMessage } from '@kbn/i18n/react';
import { MatchedItem } from '../../../../types';

interface StatusMessageProps {
  matchedIndices: {
    allIndices: MatchedItem[];
    exactMatchedIndices: MatchedItem[];
    partialMatchedIndices: MatchedItem[];
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
  let statusIcon: EuiIconType | undefined;
  let statusMessage;
  let statusColor: 'primary' | 'success' | 'warning' | undefined;

  const allIndicesLength = allIndices.length;

  if (query.length === 0) {
    statusIcon = undefined;
    statusColor = 'primary';

    if (allIndicesLength >= 1) {
      statusMessage = (
        <span>
          <FormattedMessage
            id="indexPatternManagement.createIndexPattern.step.status.matchAnyLabel.matchAnyDetail"
            defaultMessage="Your index pattern can match {sourceCount, plural,
              one {your # source}
              other {any of your # sources}
            }."
            values={{ sourceCount: allIndicesLength }}
          />
        </span>
      );
    } else if (!isIncludingSystemIndices && showSystemIndices) {
      statusMessage = (
        <span>
          <FormattedMessage
            id="indexPatternManagement.createIndexPattern.step.status.noSystemIndicesWithPromptLabel"
            defaultMessage="No Elasticsearch indices match your pattern. To view the matching system indices, toggle the switch above."
          />
        </span>
      );
    } else {
      statusMessage = (
        <span>
          <FormattedMessage
            id="indexPatternManagement.createIndexPattern.step.status.noSystemIndicesLabel"
            defaultMessage="No Elasticsearch indices match your pattern."
          />
        </span>
      );
    }
  } else if (exactMatchedIndices.length) {
    statusIcon = 'check';
    statusColor = 'success';
    statusMessage = (
      <span>
        &nbsp;
        <FormattedMessage
          id="indexPatternManagement.createIndexPattern.step.status.successLabel.successDetail"
          defaultMessage="Your index pattern matches {sourceCount} {sourceCount, plural,
            one {source}
            other {sources}
          }."
          values={{
            sourceCount: exactMatchedIndices.length,
          }}
        />
      </span>
    );
  } else if (partialMatchedIndices.length) {
    statusIcon = undefined;
    statusColor = 'primary';
    statusMessage = (
      <span>
        <FormattedMessage
          id="indexPatternManagement.createIndexPattern.step.status.partialMatchLabel.partialMatchDetail"
          defaultMessage="Your index pattern doesn't match any indices, but you have {strongIndices} which
          {matchedIndicesLength, plural,
            one {looks}
            other {look}
          } similar."
          values={{
            matchedIndicesLength: partialMatchedIndices.length,
            strongIndices: (
              <strong>
                <FormattedMessage
                  id="indexPatternManagement.createIndexPattern.step.status.partialMatchLabel.strongIndicesLabel"
                  defaultMessage="{matchedIndicesLength, plural,
                    one {index}
                    other {# indices}
                  }"
                  values={{ matchedIndicesLength: partialMatchedIndices.length }}
                />
              </strong>
            ),
          }}
        />
      </span>
    );
  } else {
    statusIcon = undefined;
    statusColor = 'warning';
    statusMessage = (
      <span>
        <FormattedMessage
          id="indexPatternManagement.createIndexPattern.step.status.notMatchLabel.notMatchDetail"
          defaultMessage="The index pattern you've entered doesn't match any indices.
          You can match {indicesLength, plural,
            one {your}
            other {any of your}
          } {strongIndices}, below."
          values={{
            strongIndices: (
              <strong>
                <FormattedMessage
                  id="indexPatternManagement.createIndexPattern.step.status.notMatchLabel.allIndicesLabel"
                  defaultMessage="{indicesLength, plural,
                    one {# index}
                    other {# indices}
                  }"
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
    <EuiCallOut
      size="s"
      color={statusColor}
      data-test-subj="createIndexPatternStatusMessage"
      iconType={statusIcon}
      title={statusMessage}
    />
  );
};
