import './introduction.less';
import React from 'react';
import PropTypes from 'prop-types';
import { Content } from './content';

export function Introduction({ description, previewUrl, title }) {
  let img;
  if (previewUrl) {
    img = (
      <img
        className="previewImage"
        src={previewUrl}
        alt=""
      />
    );
  }
  return (
    <div className="introduction kuiVerticalRhythm">
      <div className="kuiFlexGroup kuiFlexGroup--gutterLarge">

        <div className="kuiFlexItem">
          <h1 className="kuiTitle kuiVerticalRhythm">
            {title}
          </h1>
          <Content className="kuiVerticalRhythm" text={description}/>
        </div>

        <div className="kuiFlexItem kuiFlexItem--flexGrowZero">
          {img}
        </div>

      </div>
    </div>
  );
}

Introduction.propTypes = {
  description: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  previewUrl: PropTypes.string
};
