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
import { shallow } from 'enzyme';
import { intl } from './mocks/intl';

/**
 *  Creates the wrapper instance with provided intl object into context
 *
 *  @param  node The React element or cheerio wrapper
 *  @param  options properties to pass into shallow wrapper
 *  @return The wrapper instance around the rendered output with intl object in context
 */
export function shallowWithIntl(node, { context, childContextTypes, ...props } = {}) {
  if (!node) {
    throw new Error(`First argument should be cheerio object or React element, not ${node}`);
  }

  const clonedNode = React.cloneElement(node, { intl });

  const options = {
    context: {
      ...context,
      intl,
    },
    childContextTypes: {
      ...childContextTypes,
      intl: PropTypes.any,
    },
    ...props,
  };

  if (React.isValidElement(node)) {
    return shallow(clonedNode, options);
  }

  return clonedNode.shallow(options);
}

export { intl };
