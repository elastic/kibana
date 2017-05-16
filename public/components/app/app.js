import React from 'react';
import PropTypes from 'prop-types';
import { Grid, Row, Col } from 'react-bootstrap';

import { Expression } from '../expression';
import { Sidebar } from '../sidebar';
import { RenderExpression } from '../render_expression';

export const App = () => (
  <div>
    <Grid fluid>
      <Row>
        <Col xs={12}>
          <Expression />
        </Col>
      </Row>
      <Row>
        <Col md={3} smHidden xsHidden>
          <Sidebar />
        </Col>
        <Col md={9} xs={12}>
          <RenderExpression />
        </Col>
      </Row>
    </Grid>
  </div>
);

App.propTypes = {
  expression: PropTypes.string,
  renderable: PropTypes.object,
  expressionSet: PropTypes.func,
  expressionRun: PropTypes.func,
};
