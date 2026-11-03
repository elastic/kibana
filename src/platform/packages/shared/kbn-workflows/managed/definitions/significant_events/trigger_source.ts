/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * `triggeredBy` of every run of an entry point that the detection engine starts. The entry points
 * fail any other run, so work as the service account goes through Significant Events and its
 * checks rather than the generic workflow run API. Only server code sets `triggeredBy`.
 */
export const NIGHTSHIFT_DETECTION_ENGINE_TRIGGER_SOURCE = 'nightshift-detection-engine';
