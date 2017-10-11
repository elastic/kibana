import React from 'react';
import { PropTypes } from 'prop-types';
import { Popover, OverlayTrigger } from 'react-bootstrap';
import './arg_add_popover.less';
import { ArgAdd } from '../arg_add';
import { get } from 'lodash';

export const ArgAddPopover = ({ options }) => {
  let close;
  const linkRef = (refNode) => {
    // TODO: handleHide is a private method, there must be a supported way to do this, I just don't know
    // what it is.
    close = get(refNode, 'handleHide');
  };

  const picker = (
    <Popover className="canvas__add-arg-popover" id="arg-add-popover">
      {options.map(opt => (
        <ArgAdd key={`${opt.arg.name}-add`}
          displayName={opt.arg.displayName}
          description={opt.arg.description}
          onValueAdd={() => { opt.onValueAdd(...arguments); close();}}
        />
      ))}
    </Popover>
  );

  return (
      <OverlayTrigger
        rootClose
        overlay={picker}
        placement="bottom"
        trigger="click"
        ref={linkRef}
      >
        <i className="fa fa-plus-circle canvas__add-arg-button"/>
      </OverlayTrigger>
  );
};

ArgAddPopover.propTypes = {
  options: PropTypes.array.isRequired,
};
