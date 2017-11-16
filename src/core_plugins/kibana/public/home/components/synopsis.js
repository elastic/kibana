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
    <a href={url} className="kuiLink synopsis">
      <KuiFlexGroup>
        <KuiFlexItem grow={false}>{img}</KuiFlexItem>
        <KuiFlexItem className="synopsisContent">
          <h4 className="kuiTextTitle synopsisTitle">
            {title}
          </h4>
          <p className="kuiText kuiSubduedText">
            {description}
          </p>
        </KuiFlexItem>
      </KuiFlexGroup>
    </a>
  );
}

Synopsis.propTypes = {
  description: PropTypes.string.isRequired,
  iconUrl: PropTypes.string,
  title: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};
