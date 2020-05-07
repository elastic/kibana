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

export const GuidePageSideNav = props => {
  return (
    <div className="guidePageSideNav">
      <div className="guidePageSideNav__title">{props.title}</div>

      <div className="guidePageSideNavMenu">{props.children}</div>
    </div>
  );
};

GuidePageSideNav.propTypes = {
  title: PropTypes.string,
  children: PropTypes.any,
};
