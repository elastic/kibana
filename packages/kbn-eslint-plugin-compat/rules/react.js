/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { rules } = require('eslint-plugin-react');

// eslint-plugin-react rules that oxlint doesn't implement.
module.exports = {
  'react-boolean-prop-naming': rules['boolean-prop-naming'],
  'react-jsx-no-bind': rules['jsx-no-bind'],
  'react-no-deprecated': rules['no-deprecated'],
  'react-no-typos': rules['no-typos'],
  'react-no-unused-prop-types': rules['no-unused-prop-types'],
  'react-prefer-stateless-function': rules['prefer-stateless-function'],
  'react-sort-default-props': rules['sort-default-props'],
};
