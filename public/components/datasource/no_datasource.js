import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar } from 'react-bootstrap';

export const NoDatasource = ({ done }) => (
  <div>
    <h3>No Datasource Detected</h3>
    <p>
      Its not that you're not connected to any data. Maybe you are, maybe you're not. But if you are, I don't know about it.
      I looked for a data source in your expression, because I really wanted to give you a fancy interface to it. Alas, I
      could not find one that I know about.
    </p>

    <p>
      I'm just going to trust that you know what you're doing. You look smart. We should hang out more. What are you doing
      Thursday?
    </p>
    <br/>
    <ButtonToolbar>
      <Button onClick={done}> Close</Button>
    </ButtonToolbar>
  </div>
);

NoDatasource.propTypes = {
  done: PropTypes.func,
};
