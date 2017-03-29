import React, { PropTypes } from 'react';
import _ from 'lodash';

function ErrorComponent(props) {
  const { error } = props;
  let additionalInfo;
  const type = _.get(error, 'error.caused_by.type');

  if (type === 'script_exception') {
    const scriptStack = _.get(error, 'error.caused_by.script_stack');
    const reason = _.get(error, 'error.caused_by.caused_by.reason');
    additionalInfo = (
      <div className="metrics_error__additional">
        <div className="metrics_error__reason">{ reason }</div>
        <div className="metrics_error__stack">{ scriptStack.join('\n')}</div>
      </div>
    );
  } else {
    const reason = _.get(error, 'error.caused_by.reason');
    additionalInfo = (
      <div className="metrics_error__additional">
        <div className="metrics_error__reason">{ reason }</div>
      </div>
    );
  }

  return (
    <div className="metrics_error">
      <div className="merics_error__title">The request for this panel failed.</div>
      { additionalInfo }
    </div>
  );
}

ErrorComponent.propTypes = {
  error: PropTypes.object
};

export default ErrorComponent;
