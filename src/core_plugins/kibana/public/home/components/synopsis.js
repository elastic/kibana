import './synopsis.less';
import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';

export function Synopsis({ description, iconUrl, title, url }) {
  let optionalImg;
  if (iconUrl) {
    optionalImg = (
      <EuiFlexItem grow={false}>
        <img
          className="synopsisIcon"
          src={iconUrl}
          alt=""
        />
      </EuiFlexItem>
    );
  }

  return (
    <a
      href={url}
      className="kuiLink synopsis"
      data-test-subj={`homeSynopsisLink${title.toLowerCase()}`}
    >
      <EuiFlexGroup>
        {optionalImg}
        <EuiFlexItem className="synopsisContent">
          <h4 className="kuiTextTitle synopsisTitle">
            {title}
          </h4>
          <p className="kuiText kuiSubduedText">
            {description}
          </p>
        </EuiFlexItem>
      </EuiFlexGroup>
    </a>
  );
}

Synopsis.propTypes = {
  description: PropTypes.string.isRequired,
  iconUrl: PropTypes.string,
  title: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};
