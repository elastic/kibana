import React from 'react';
import PropTypes from 'prop-types';
import { withState } from 'recompose';
import { Button, Well } from 'react-bootstrap';

const ShowDebuggingComponent = ({ payload, expanded, setExpanded }) => (
  <div>
    <Button bsStyle="link" onClick={() => setExpanded(!expanded)}>
      {expanded && (<span className="fa fa-caret-down" />)}
      {!expanded && (<span className="fa fa-caret-right" />)}
      &nbsp;See Details
    </Button>
    {expanded && (
      <Well className="canvas_error-render--debug-payload">
        <pre>
          {JSON.stringify(payload, null, 2)}
        </pre>
      </Well>
    )}
  </div>
);

ShowDebuggingComponent.propTypes = {
  expanded: PropTypes.bool.isRequired,
  setExpanded: PropTypes.func.isRequired,
  payload: PropTypes.object.isRequired,
};

export const ShowDebugging = withState('expanded', 'setExpanded', false)(ShowDebuggingComponent);
