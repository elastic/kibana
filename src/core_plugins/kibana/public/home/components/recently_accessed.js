import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiPanel,
  EuiButtonEmpty,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';

export function RecentlyAccessed({ recentlyAccessed }) {

  const renderRecentlyAccessed = () => {
    return recentlyAccessed.map((item) => {
      const shortLabel = item.label.length <= 32 ? item.label : `${item.label.substring(0, 31)}...`;
      return (
        <EuiButtonEmpty
          key={item.link}
          href={item.link}
        >
          {shortLabel}
        </EuiButtonEmpty>
      );
    });
  };

  return (
    <EuiPanel paddingSize="l">
      <EuiText>
        <p>
          <EuiTextColor color="subdued">
            Recently accessed
          </EuiTextColor>
        </p>
      </EuiText>

      <div>
        {renderRecentlyAccessed()}
      </div>

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
