/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { EuiCard, EuiIcon } from '@elastic/eui';

export function Synopsis({
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
    optionalImg = <img className="synopsisIcon" src={iconUrl} alt="" />;
  } else if (iconType) {
    optionalImg = (
      <EuiIcon
        type={iconType}
        // color="primary"
        size="l"
      />
    );
  }

  const classes = classNames('homSynopsis__card', {
    'homSynopsis__card--noPanel': !wrapInPanel,
  });

  return (
    <EuiCard
      className={classes}
      layout="horizontal"
      icon={optionalImg}
      title={title}
      description={description}
      onClick={onClick}
      href={url}
      data-test-subj={`homeSynopsisLink${title.toLowerCase()}`}
      betaBadgeLabel={isBeta ? 'Beta' : null}
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
