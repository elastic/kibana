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

import { EuiFlexGroup, EuiFlexItem, EuiI18n } from '@elastic/eui';

interface IEuiHeaderAlertProps {
  action: JSX.Element;
  className?: string;
  date: string;
  text: string;
  title: string;
  badge?: JSX.Element;
  rest?: string[];
}

export const EuiHeaderAlert = ({
  action,
  className,
  date,
  text,
  title,
  badge,
  ...rest
}: IEuiHeaderAlertProps) => {
  const classes = classNames('euiHeaderAlert', 'kbnNewsFeed__headerAlert', className);

  const badgeContent = badge || null;

  return (
    <EuiI18n token="euiHeaderAlert.dismiss" default="Dismiss">
      {(dismiss: any) => (
        <div className={classes} {...rest}>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <div className="euiHeaderAlert__date">{date}</div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{badgeContent}</EuiFlexItem>
          </EuiFlexGroup>

          <div className="euiHeaderAlert__title">{title}</div>
          <div className="euiHeaderAlert__text">{text}</div>
          <div className="euiHeaderAlert__action euiLink">{action}</div>
        </div>
      )}
    </EuiI18n>
  );
};

EuiHeaderAlert.propTypes = {
  action: PropTypes.node,
  className: PropTypes.string,
  date: PropTypes.node.isRequired,
  text: PropTypes.node,
  title: PropTypes.node.isRequired,
  badge: PropTypes.node,
};
