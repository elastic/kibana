import React from 'react';
import { Grid, Row, Col, Button } from 'react-bootstrap';


import { connect } from 'react-redux';
import { Expression } from '../../components/expression/expression';
import { Render } from '../../components/render/render';
import { expressionSet } from '../../state/actions/expression';
import { expressionRun } from '../../state/actions/interpret';

function AppComponent({ expression, render, dispatch }) {
  return (
    <div>
      <Grid fluid={true}>
        <Row>
          <Col xs={12}>
            <Expression value={expression} onChange={(val) => dispatch(expressionSet(val))}/>
            <Button bsStyle="primary" onClick={() => dispatch(expressionRun(expression))}>Run</Button>
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

function mapStateToProps(state) {
  return {
    render: state.throwAway.render,
    expression: state.throwAway.expression
  };
}

export const App = connect(mapStateToProps)(AppComponent);
