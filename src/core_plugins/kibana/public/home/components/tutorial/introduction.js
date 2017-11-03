import React from 'react';
import PropTypes from 'prop-types';

export function Introduction({ description, title }) {
  return (
    <div className="tutorialIntroduction">

      <h1 className="kuiTitle">
        {title}
      </h1>

      <p className="kuiText kuiSubduedText kuiVerticalRhythm kuiVerticalRhythmSmall">
        {description}
      </p>

    </div>
  );
}

Introduction.propTypes = {
  description: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired
};
