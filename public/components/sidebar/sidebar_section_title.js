import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from '../tooltip';

export const SidebarSectionTitle = ({ title, tip, children }) => (
  <div className="canvas__sidebar-section-title">
    {tip ?
      (<Tooltip placement="left" text={tip}>
        <span>{ title }</span>
      </Tooltip>)
    :
      (<span>{ title }</span>)
    }
    {children}
  </div>
);

SidebarSectionTitle.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  tip: PropTypes.string,
};
