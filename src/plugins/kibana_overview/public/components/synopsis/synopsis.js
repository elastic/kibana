/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { EuiCard, EuiIcon } from '@elastic/eui';

export function Synopsis({
  id,
  description,
  iconUrl,
  iconType,
  title,
  url,
  wrapInPanel,
  onClick,
  isBeta,
}) {
  let optionalImg;
  if (iconUrl) {
    optionalImg = <img alt="" className="synopsisIcon" src={iconUrl} />;
  } else if (iconType) {
    optionalImg = <EuiIcon color="text" size="l" title="" type={iconType} />;
  }

  const classes = classNames('homSynopsis__card', {
    'homSynopsis__card--noPanel': !wrapInPanel,
  });

  return (
    <EuiCard
      className={classes}
      layout="horizontal"
      icon={optionalImg}
      titleSize="xs"
      title={title}
      description={description}
      onClick={onClick}
      href={url}
      data-test-subj={`homeSynopsisLink${id.toLowerCase()}`}
      betaBadgeProps={{ label: isBeta ? 'Beta' : null }}
      titleElement="h3"
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
