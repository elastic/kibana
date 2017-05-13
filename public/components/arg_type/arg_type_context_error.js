import React from 'react';
import PropTypes from 'prop-types';
import { Panel } from 'react-bootstrap';

export const ArgTypeContextError = ({ name, context }) => (
  <Panel header={ name }>
    <div>ERROR: {context.error}</div>
  </Panel>
);

ArgTypeContextError.propTypes = {
  name: PropTypes.string,
  context: PropTypes.object,
};
