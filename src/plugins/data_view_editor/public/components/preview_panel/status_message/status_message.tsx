/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';

import { FormattedMessage } from '@kbn/i18n-react';
import { MatchedIndicesSet } from '../../../types';

interface StatusMessageProps {
  matchedIndices: MatchedIndicesSet;
  isIncludingSystemIndices: boolean;
  query: string;
  showSystemIndices: boolean;
}

const NoMatchStatusMessage = (allIndicesLength: number) => (
  <span>
    <FormattedMessage
      id="indexPatternEditor.status.notMatchLabel.notMatchDetail"
      defaultMessage="The index pattern you entered doesn't match any data streams, indices, or index aliases.
  You can match {strongIndices}."
      values={{
        strongIndices: (
          <strong>
            <FormattedMessage
              id="indexPatternEditor.status.notMatchLabel.allIndicesLabel"
              defaultMessage="{indicesLength, plural,
            one {# source}
            other {# sources}
          }"
              values={{ indicesLength: allIndicesLength }}
            />
          </strong>
        ),
      }}
    />
  </span>
);

const NoMatchNoIndicesStatusMessage = () => (
  <span>
    <FormattedMessage
      id="indexPatternEditor.status.notMatchLabel.notMatchNoIndicesDetail"
      defaultMessage="The index pattern you entered doesn't match any data streams, indices, or index aliases."
    />
  </span>
);

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
            id="indexPatternEditor.status.matchAnyLabel.matchAnyDetail"
            defaultMessage="Your index pattern can match {sourceCount, plural,
              one {# source}
              other {# sources}
            }."
            values={{ sourceCount: allIndicesLength }}
          />
        </span>
      );
    } else if (!isIncludingSystemIndices && showSystemIndices) {
      statusMessage = (
        <span>
          <FormattedMessage
            id="indexPatternEditor.status.noSystemIndicesWithPromptLabel"
            defaultMessage="No data streams, indices, or index aliases match your index pattern."
          />
        </span>
      );
    } else {
      statusMessage = (
        <span>
          <FormattedMessage
            id="indexPatternEditor.status.noSystemIndicesLabel"
            defaultMessage="No data streams, indices, or index aliases match your index pattern."
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
          id="indexPatternEditor.status.successLabel.successDetail"
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
          id="indexPatternEditor.status.partialMatchLabel.partialMatchDetail"
          defaultMessage="Your index pattern doesn't match any data streams, indices, or index aliases, but {strongIndices}
          {matchedIndicesLength, plural,
            one {is}
            other {are}
          } similar."
          values={{
            matchedIndicesLength: partialMatchedIndices.length,
            strongIndices: (
              <strong>
                <FormattedMessage
                  id="indexPatternEditor.status.partialMatchLabel.strongIndicesLabel"
                  defaultMessage="{matchedIndicesLength, plural,
                    one {source}
                    other {# sources}
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
    statusMessage = allIndicesLength
      ? NoMatchStatusMessage(allIndicesLength)
      : NoMatchNoIndicesStatusMessage();
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
