/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-var */

function systemIsDark() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (e) {
    return false;
  }
}

function createInlineStyles(content) {
  var head = document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.textContent = content;
  head.appendChild(style);
}

// must be kept in sync with
// src/core/packages/rendering/server-internal/src/views/styles.tsx

var lightStyles = [
  'html { background-color: #F6F9FC; }',
  '.kbnWelcomeText { color: #5A6D8C; }',
  '.kbnProgress { background-color: #ECF1F9; }',
  '.kbnProgress:before { background-color: #0B64DD; }',
].join('\n');

var darkStyles = [
  'html { background-color: #07101F; }',
  '.kbnWelcomeText { color: #8E9FBC; }',
  '.kbnProgress { background-color: #172336; }',
  '.kbnProgress:before { background-color: #599DFF; }',
].join('\n');

if (systemIsDark()) {
  createInlineStyles(darkStyles);
} else {
  createInlineStyles(lightStyles);
}
