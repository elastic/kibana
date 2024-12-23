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
// packages/core/rendering/core-rendering-server-internal/src/views/styles.tsx

var lightStyles = [
  'html { background-color: #F8FAFD; }',
  '.kbnWelcomeText { color: #69707D; }',
  '.kbnProgress { background-color: #F5F7FA; }',
  '.kbnProgress:before { background-color: #006DE4; }',
].join('\n');

var darkStyles = [
  'html { background-color: #141519; }',
  '.kbnWelcomeText { color: #98A2B3; }',
  '.kbnProgress { background-color: #25262E; }',
  '.kbnProgress:before { background-color: #1BA9F5; }',
].join('\n');

if (systemIsDark()) {
  createInlineStyles(darkStyles);
} else {
  createInlineStyles(lightStyles);
}
