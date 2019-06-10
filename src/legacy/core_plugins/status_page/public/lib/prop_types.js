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

export const State = PropTypes.shape({
  id: PropTypes.string.isRequired,
  message: PropTypes.string,  // optional
  title: PropTypes.string,   // optional
  uiColor: PropTypes.string.isRequired,
});

export const Metric = PropTypes.shape({
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.number),
    PropTypes.number
  ]).isRequired,
  type: PropTypes.string  // optional
});
