import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar } from 'react-bootstrap';

export const UnknownArgs = ({ unknownArgs, done }) => (
  <div>
    <h2>Unknown Arguements Found</h2>
    <p>
      There are arguments in the expression that can not be converting into an interface.
      Use the expression editor to update the datasource.
    </p>
    <p>
      The following unknown arguments were found:
    </p>
    <ul>{unknownArgs.map(name => (<li key={name}>{name}</li>))}</ul>
    <ButtonToolbar>
      <Button onClick={done}> Close</Button>
    </ButtonToolbar>
  </div>
);

UnknownArgs.propTypes = {
  done: PropTypes.func,
  unknownArgs: PropTypes.array,
};
