import './synopsis.less';
import React from 'react';
import PropTypes from 'prop-types';

export function Synopsis({ description, title, url }) {
  return (
    <div>
      <h4 className="kuiTextTitle kuiVerticalRhythmSmall">
        <a href={url} className="kuiLink">
          {title}
        </a>
      </h4>
      <p className="kuiText kuiSubduedText kuiVerticalRhythmSmall">
        {description}
      </p>
    </div>
  );
}

Synopsis.propTypes = {
  description: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};
