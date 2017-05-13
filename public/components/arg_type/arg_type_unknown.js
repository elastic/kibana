import React from 'react';
import PropTypes from 'prop-types';
import { Panel } from 'react-bootstrap';

export const ArgTypeUnknown = ({ name }) => (
  <Panel header={ name } bsStyle="warning">
    <div>Unknown expression type</div>
  </Panel>
);

ArgTypeUnknown.propTypes = {
  name: PropTypes.string.isRequired,
};
