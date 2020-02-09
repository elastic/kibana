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

import { render, configure } from 'enzyme';

import EnzymeAdapter from 'enzyme-adapter-react-16';

import html from 'html';

configure({ adapter: new EnzymeAdapter() });

export function renderToHtml(componentReference, props = {}) {
  // If there's a failure, just return an empty string. The actual component itself should
  // trip an error boundary in the UI when it fails.
  try {
    // Create the React element, render it and get its HTML, then format it prettily.
    const element = React.createElement(componentReference, props);
    const htmlString = render(element).html();
    return html.prettyPrint(htmlString, {
      indent_size: 2,
      unformatted: [], // Expand all tags, including spans
    });
  } catch (e) {
    return '';
  }
}
