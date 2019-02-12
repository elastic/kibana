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

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';

const markdownRenderers = {
  root: Fragment,
};

// Render markdown string into JSX inside of a Fragment.
export const MarkdownSimple = ({ children }) => (
  <ReactMarkdown renderers={markdownRenderers}>{children}</ReactMarkdown>
);

MarkdownSimple.propTypes = {
  children: PropTypes.string,
};
