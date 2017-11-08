import './synopsis.less';
import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiFlexGroup,
  KuiFlexItem
} from 'ui_framework/components';

export function Synopsis({ description, iconUrl, title, url }) {
  let img;
  if (iconUrl) {
    img = (
      <img
        className="synopsisIcon"
        src={iconUrl}
        alt=""
      />
    );
  }

  return (
    <KuiFlexGroup>
      <KuiFlexItem grow={false}>{img}</KuiFlexItem>
      <KuiFlexItem className="synopsis">
        <h4 className="kuiTextTitle synopsisTitle">
          <a href={url} className="kuiLink">
            {title}
          </a>
        </h4>
        <p className="kuiText kuiSubduedText">
          {description}
        </p>
      </KuiFlexItem>
    </KuiFlexGroup>
  );
}

Synopsis.propTypes = {
  description: PropTypes.string.isRequired,
  iconUrl: PropTypes.string,
  title: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};
