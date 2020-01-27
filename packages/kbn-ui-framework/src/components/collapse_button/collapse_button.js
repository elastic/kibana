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

import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

const DIRECTIONS = ['down', 'up', 'left', 'right'];

const directionToClassNameMap = {
  down: 'fa-chevron-circle-down',
  up: 'fa-chevron-circle-up',
  left: 'fa-chevron-circle-left',
  right: 'fa-chevron-circle-right',
};

const KuiCollapseButton = ({ className, direction, ...rest }) => {
  const classes = classNames('kuiCollapseButton', className);
  const childClasses = classNames('kuiIcon', directionToClassNameMap[direction]);

  return (
    <button type="button" className={classes} {...rest}>
      <span className={childClasses} />
    </button>
  );
};

KuiCollapseButton.propTypes = {
  className: PropTypes.string,
  direction: PropTypes.oneOf(DIRECTIONS).isRequired,
};

export { DIRECTIONS, KuiCollapseButton };
