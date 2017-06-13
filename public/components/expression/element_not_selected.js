import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

export const ElementNotSelected = ({ done }) => (
  <div>
    <div>Select an element to show expression input</div>
    {done ?
      (<Button onClick={done}> Close</Button>)
    : null}
  </div>
);

ElementNotSelected.propTypes = {
  done: PropTypes.func,
};
