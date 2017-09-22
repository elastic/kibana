import React from 'react';
import { PropTypes } from 'prop-types';
import { Popover, OverlayTrigger } from 'react-bootstrap';
import './arg_add_popover.less';
import { ArgAdd } from '../arg_add';
import { Tooltip } from '../tooltip';

export const ArgAddPopover = ({ options }) => {
  const picker = (
    <Popover className="canvas__add-arg-popover" id="arg-add-popover">
      {options.map(opt => (
        <ArgAdd key={`${opt.arg.name}-add`}
          displayName={opt.arg.displayName}
          onValueAdd={opt.onValueAdd}
        />
      ))}
    </Popover>
  );


  if (options.length === 1) {
    return (
      <div className="canvas__add-arg-container">
        <Tooltip text={`Add ${options[0].arg.displayName}`} placement="bottom">
          <div className="canvas__add-arg-button" onClick={options[0].onValueAdd}>
            <i className="fa fa-plus"/>
          </div>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="canvas__add-arg-container">
      <OverlayTrigger
        rootClose
        overlay={picker}
        placement="bottom"
        trigger="click"
      >
        <div className="canvas__add-arg-button">
          <i className="fa fa-plus"/>
        </div>
      </OverlayTrigger>

    </div>
  );
};

ArgAddPopover.propTypes = {
  options: PropTypes.array.isRequired,
};
