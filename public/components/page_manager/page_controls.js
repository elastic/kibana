import React from 'react';
import PropTypes from 'prop-types';

export const PageControls = ({ pageId, duplicatePage, movePage }) => (
  <div className="canvas__page-manager--page-controls">
    <span className="fa fa-angle-double-left canvas__page-manager--page-move" onClick={() => movePage(pageId, -1)} />
    <span className="fa fa-files-o" onClick={() => duplicatePage(pageId)} />
    <span className="fa fa-angle-double-right canvas__page-manager--page-move" onClick={() => movePage(pageId, +1)} />
  </div>
);

PageControls.propTypes = {
  pageId: PropTypes.string.isRequired,
  duplicatePage: PropTypes.func.isRequired,
  movePage: PropTypes.func.isRequired,
};
