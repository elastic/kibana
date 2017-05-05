import React from 'react';
import PropTypes from 'prop-types';
import { Grid, Row, Col, Button } from 'react-bootstrap';

import { Expression } from '../expression';
import { Render } from '../render';

export function App({ expression, renderable, expressionSet, expressionRun }) {
  function done() {
    console.log('rendered!');
  }

  return (
    <div>
      <Grid fluid>
        <Row>
          <Col xs={12}>
            <Expression value={expression} onChange={(val) => expressionSet(val)}/>
            <Button bsStyle="primary" onClick={() => expressionRun(expression)}>Run</Button>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <Render expressionOutput={renderable} done={done}/>
          </Col>
        </Row>
      </Grid>
    </div>
  );
}

App.propTypes = {
  expression: PropTypes.string,
  renderable: PropTypes.object,
  expressionSet: PropTypes.func,
  expressionRun: PropTypes.func,
};
