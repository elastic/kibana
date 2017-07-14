import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar } from 'react-bootstrap';

export const NoDatasource = ({ done }) => (
  <div>
    <h2>No Datasource</h2>
    <ButtonToolbar>
      <Button onClick={done}> Close</Button>
    </ButtonToolbar>
  </div>
);

NoDatasource.propTypes = {
  done: PropTypes.func,
};
