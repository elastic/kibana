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
/* global jest */

export const intl = {
  formatMessage: jest.fn().mockImplementation(({ defaultMessage }) => defaultMessage),
  formatDate: jest.fn().mockImplementation(value => value),
  formatTime: jest.fn().mockImplementation(value => value),
  formatRelative: jest.fn().mockImplementation(value => value),
  formatNumber: jest.fn().mockImplementation(value => value),
  formatPlural: jest.fn().mockImplementation(value => value),
  formatHTMLMessage: jest.fn().mockImplementation(({ defaultMessage }) => defaultMessage),
  now: jest.fn().mockImplementation(() => new Date(1531834573179)),
  textComponent: 'span',
};
