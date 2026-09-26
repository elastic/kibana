/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Experimental Task Manager heap-profile label wrap.
 * No-op unless KBN_HEAP_PROFILE_LABELS=1 and v8.withHeapProfileLabels exists.
 * Label key is only `task.type` (registered type). Never task.id / SO id.
 */

const v8 = require('v8');

const HEAP_PROFILE_LABELS_ENV = 'KBN_HEAP_PROFILE_LABELS';
const TASK_TYPE_LABEL_KEY = 'task.type';

function isHeapProfileLabelsEnabled() {
  return process.env[HEAP_PROFILE_LABELS_ENV] === '1';
}

function hasHeapProfileLabelsApi() {
  return typeof v8.withHeapProfileLabels === 'function';
}

/**
 * @template T
 * @param {string} taskType
 * @param {() => T} run
 * @returns {T}
 */
function withTaskTypeHeapProfileLabels(taskType, run) {
  if (!isHeapProfileLabelsEnabled() || !hasHeapProfileLabelsApi()) {
    return run();
  }
  return v8.withHeapProfileLabels({ [TASK_TYPE_LABEL_KEY]: String(taskType) }, run);
}

/**
 * enterWith-style fallback when the framework returns before the handler runs.
 * @param {string} taskType
 */
function setTaskTypeHeapProfileLabels(taskType) {
  if (!isHeapProfileLabelsEnabled() || typeof v8.setHeapProfileLabels !== 'function') {
    return;
  }
  v8.setHeapProfileLabels({ [TASK_TYPE_LABEL_KEY]: String(taskType) });
}

module.exports = {
  HEAP_PROFILE_LABELS_ENV,
  TASK_TYPE_LABEL_KEY,
  isHeapProfileLabelsEnabled,
  hasHeapProfileLabelsApi,
  withTaskTypeHeapProfileLabels,
  setTaskTypeHeapProfileLabels,
};
