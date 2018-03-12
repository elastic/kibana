import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiTextColor,
  EuiSpacer,
  EuiLink,
  EuiButton,
} from '@elastic/eui';

export const EmptyState = ({
  loadingDataDocUrl,
  onRefresh,
}) => (
  <EuiPanel paddingSize="l">
    <EuiFlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <EuiTextColor color="subdued">
            <h2 style={{ textAlign: 'center' }}>Couldn&apos;t find any Elasticsearch data</h2>
          </EuiTextColor>
        </EuiTitle>
        <EuiSpacer size="s"/>
        <EuiText>
          <p>
            <EuiTextColor color="subdued">
              You&apos;ll need to index some data into Elasticsearch before you can create an index pattern.
            </EuiTextColor>
            &nbsp;
            <EuiLink
              href={loadingDataDocUrl}
              target="_blank"
            >
              Learn how.
            </EuiLink>
          </p>
        </EuiText>

        <EuiSpacer size="m"/>

        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="refresh"
              onClick={onRefresh}
              data-test-subj="refreshIndicesButton"
            >
              Check for new data
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

EmptyState.propTypes = {
  loadingDataDocUrl: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};
