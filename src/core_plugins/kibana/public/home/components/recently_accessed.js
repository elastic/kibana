import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';

export function RecentlyAccessed({ recentlyAccessed }) {

  console.log(recentlyAccessed);

  return (
    <EuiPanel paddingSize="l">
      <EuiText>
        <p>
          <EuiTextColor color="subdued">
            Recently accessed
          </EuiTextColor>
        </p>
      </EuiText>

    </EuiPanel>
  );
}

export const recentlyAccessedShape = PropTypes.shape({
  label: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
});

RecentlyAccessed.propTypes = {
  recentlyAccessed: PropTypes.arrayOf(recentlyAccessedShape).isRequired
};
