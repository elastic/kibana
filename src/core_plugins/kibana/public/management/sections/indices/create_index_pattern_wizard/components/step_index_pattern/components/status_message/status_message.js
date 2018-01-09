import React from 'react';
import { getWhitelistedIndices } from '../../../../lib/get_whitelisted_indices';

import {
  EuiText,
  EuiTextColor,
  EuiIcon,
} from '@elastic/eui';

export const StatusMessage = ({
  initialIndices,
  matchingIndices,
  query,
  isIncludingSystemIndices,
}) => {
  const {
    initialIndices: whitelistedInitialIndices,
    exactMatchingIndices,
    partialMatchingIndices
  } = getWhitelistedIndices(initialIndices, isIncludingSystemIndices, query, matchingIndices);

  let statusIcon;
  let statusMessage;
  let statusColor;

  if (query.length === 0) {
    statusIcon = null;
    statusColor = 'default';
    statusMessage = whitelistedInitialIndices.length > 1
      ? (
        <span>
          Your index pattern can match any of your <strong>{whitelistedInitialIndices.length} indices</strong>, below.
        </span>
      )
      : (<span>You only have a single index. You can create an index pattern to match it.</span>);
  }
  else if (exactMatchingIndices.length) {
    statusIcon = 'check';
    statusColor = 'secondary';
    statusMessage = (
      <span>
        &nbsp;
        <strong>Success!</strong>
        &nbsp;
        Your index pattern matches <strong>{exactMatchingIndices.length} {exactMatchingIndices.length > 1 ? 'indices' : 'index'}</strong>.
      </span>
    );
  }
  else if (partialMatchingIndices.length) {
    statusIcon = null;
    statusColor = 'default';
    statusMessage = (
      <span>
        Your index pattern doesn&apos;t match any indices, but you have&nbsp;
        <strong>
          {partialMatchingIndices.length} {partialMatchingIndices.length > 1 ? 'indices ' : 'index '}
        </strong>
        which {partialMatchingIndices.length > 1 ? 'look' : 'looks'} similar.
      </span>
    );
  }
  else if (whitelistedInitialIndices.length) {
    statusIcon = null;
    statusColor = 'default';
    statusMessage = (
      <span>
        The index pattern you&apos;ve entered doesn&apos;t match any indices.
        You can match any of your <strong>{whitelistedInitialIndices.length} indices</strong>, below.
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
