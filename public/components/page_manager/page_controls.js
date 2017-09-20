import React from 'react';
import PropTypes from 'prop-types';

export const PageControls = ({ pageId, movePage, duplicatePage, removePage }) => (
  <div className="canvas__page-manager--page-controls">
    <span className="fa fa-angle-double-left move-left" onClick={() => movePage(pageId, -1)} />
    <span className="fa fa-trash delete" onClick={() => removePage(pageId)} />
    <span className="fa fa-files-o duplicate" onClick={() => duplicatePage(pageId)} />
    <span className="fa fa-angle-double-right move-right" onClick={() => movePage(pageId, 1)} />
  </div>
);

PageControls.propTypes = {
  pageId: PropTypes.string.isRequired,
  movePage: PropTypes.func.isRequired,
  duplicatePage: PropTypes.func.isRequired,
  removePage: PropTypes.func.isRequired,
};
