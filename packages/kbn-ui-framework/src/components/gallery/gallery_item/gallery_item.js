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

const checkHrefAndOnClick = (props, propName, componentName) => {
  if (props.href && props.onClick) {
    throw new Error(
      `${componentName} must either specify an href property (if it should be a link) ` +
      `or an onClick property (if it should be a button), but not both.`
    );
  }
};

export const KuiGalleryItem = ({ children, className, href, ...rest }) => {
  const classes = classNames('kuiGalleryItem', className);
  if (href) {
    return (
      <a
        className={classes}
        href={href}
        {...rest}
      >
        {children}
      </a>
    );
  } else {
    return (
      <button
        className={classes}
        {...rest}
      >
        {children}
      </button>
    );
  }
};
KuiGalleryItem.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  href: checkHrefAndOnClick,
  onClick: PropTypes.func,
};
