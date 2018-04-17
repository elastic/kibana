import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from '../tooltip';

export const SidebarSectionTitle = ({ title, tip, children }) => {
  const renderTitle = () => {
    if (tip) {
      return (
        <Tooltip placement="left" text={tip}>
          <span>{title}</span>
        </Tooltip>
      );
    }

    return <span>{title}</span>;
  };

  return (
    <div className="canvas__sidebar-section-title">
      {renderTitle(tip)}
      {children}
    </div>
  );
};

SidebarSectionTitle.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  tip: PropTypes.string,
};
