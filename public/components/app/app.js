import React from 'react';
import PropTypes from 'prop-types';
import { Grid, Row, Col, Button } from 'react-bootstrap';

import { Expression } from '../expression';
import { Render } from '../render';

export function App({ expression, render, expressionSet, expressionRun }) {
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
            <Render expressionOutput={render} />
          </Col>
        </Row>
      </Grid>
    </div>
  );
}

App.propTypes = {
  expression: PropTypes.string,
  render: PropTypes.object,
  expressionSet: PropTypes.func,
  expressionRun: PropTypes.func,
};
