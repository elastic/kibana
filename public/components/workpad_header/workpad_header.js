import React from 'react';
import PropTypes from 'prop-types';
import { Toggle } from '../toggle';
import { Popover, OverlayTrigger } from 'react-bootstrap';
import { PageConfig } from '../page_config';
import { WorkpadConfig } from '../workpad_config';

import './workpad_header.less';

export const WorkpadHeader = ({ workpadName, editing, inFlight, toggleEditing }) => {
  const pageConfigPopover = (
    <Popover id="popover-trigger-click">
      <div className="canvas">
        <PageConfig/>

        <WorkpadConfig/>
      </div>
    </Popover>
  );

  return (
    <div className="canvas__workpad_header">
      <h2>
        { workpadName }
        <OverlayTrigger trigger="click" rootClose placement="bottom" overlay={pageConfigPopover}>
          <i className="fa fa-gear"/>
        </OverlayTrigger>
        <span className="canvas__workpad_header--editToggle">
          <Toggle value={editing} onChange={toggleEditing} />
        </span>
        { inFlight && (
          <span>
            <i className="fa fa-spinner fa-pulse" />
          </span>
        ) }
      </h2>
    </div>
  );
};

WorkpadHeader.propTypes = {
  workpadName: PropTypes.string,
  editing: PropTypes.bool,
  inFlight: PropTypes.bool,
  toggleEditing: PropTypes.func,
};
