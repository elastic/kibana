import './step.less';
import React from 'react';
import PropTypes from 'prop-types';

export function Step({ children, step, title }) {
  return (
    <div className="kuiVerticalRhythm">

      <div className="kuiVerticalRhythm">
        <div className="kuiSubTitle step">
          {step}
        </div>
        <h3 className="kuiSubTitle title">
          {title}
        </h3>
      </div>

      <div className="kuiVerticalRhythm">
        {children}
      </div>

    </div>
  );
}

Step.propTypes = {
  children: PropTypes.node.isRequired,
  step: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
};
