import React from 'react';
import PropTypes from 'prop-types';
import { Panel } from 'react-bootstrap';
import { Loading } from '../loading';

export const ArgTypeContextPending = ({ name }) => (
  <Panel header={ name }>
    <Loading />
  </Panel>
);

ArgTypeContextPending.propTypes = {
  name: PropTypes.string,
};
