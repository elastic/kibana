import React from 'react';
import PropTypes from 'prop-types';
import { EuiTitle, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { Tooltip } from '../tooltip';

export const SidebarSectionTitle = ({ title, tip, children }) => {
  const formattedTitle = (
    <EuiTitle size="xs">
      <h4>{title}</h4>
    </EuiTitle>
  );
  const renderTitle = () => {
    if (tip) {
      return (
        <Tooltip placement="left" content={tip}>
          {formattedTitle}
        </Tooltip>
      );
    }

    return formattedTitle;
  };

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>{renderTitle(tip)}</EuiFlexItem>
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

SidebarSectionTitle.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  tip: PropTypes.string,
};
