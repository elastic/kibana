import React from 'react';
import PropTypes from 'prop-types';
import { Content } from './content';

export function Introduction({ description, title }) {
  return (
    <div className="tutorialIntroduction">

      <h1 className="kuiTitle">
        {title}
      </h1>

      <Content text={description}/>

    </div>
  );
}

Introduction.propTypes = {
  description: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired
};
