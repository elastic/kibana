/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { EuiCard, EuiIcon } from '@elastic/eui';

export function Synopsis({ id, description, iconUrl, iconType, title, url, onClick, isBeta }) {
  let optionalImg;

  if (iconUrl) {
    optionalImg = <img alt="" className="synopsisIcon" src={iconUrl} />;
  } else if (iconType) {
    optionalImg = <EuiIcon color="text" size="l" title="" type={iconType} />;
  }

  return (
    <EuiCard
      betaBadgeProps={{ label: isBeta ? 'Beta' : null }}
      className="homSynopsis__card"
      data-test-subj={`homeSynopsisLink${id.toLowerCase()}`}
      description={description}
      href={url}
      icon={optionalImg}
      layout="horizontal"
      onClick={onClick}
      title={title}
      titleElement="h3"
      titleSize="xs"
    />
  );
}

Synopsis.propTypes = {
  description: PropTypes.string.isRequired,
  iconUrl: PropTypes.string,
  iconType: PropTypes.string,
  title: PropTypes.string.isRequired,
  url: PropTypes.string,
  onClick: PropTypes.func,
  isBeta: PropTypes.bool,
};

Synopsis.defaultProps = {
  isBeta: false,
};
