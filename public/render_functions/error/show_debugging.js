import React from 'react';
import PropTypes from 'prop-types';
import { withState } from 'recompose';
import { EuiCode, EuiButtonEmpty } from '@elastic/eui';

const ShowDebuggingComponent = ({ payload, expanded, setExpanded }) =>
  process.env.NODE_ENV === 'production' ? null : (
    <div>
      <EuiButtonEmpty
        iconType={expanded ? 'arrowDown' : 'arrowRight'}
        onClick={() => setExpanded(!expanded)}
      >
        See Details
      </EuiButtonEmpty>
      {expanded && (
        <EuiCode className="canvasErrorDebug">
          <pre>{JSON.stringify(payload, null, 2)}</pre>
        </EuiCode>
      )}
    </div>
  );

ShowDebuggingComponent.propTypes = {
  expanded: PropTypes.bool.isRequired,
  setExpanded: PropTypes.func.isRequired,
  payload: PropTypes.object.isRequired,
};

export const ShowDebugging = withState('expanded', 'setExpanded', false)(ShowDebuggingComponent);
