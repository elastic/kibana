/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Describes current status of the Elasticsearch connection.
 */
export enum ElasticsearchConnectionStatus {
  /**
   * Indicates that current Elasticsearch connection configuration valid and sufficient.
   */
  Configured = 'configured',

  /**
   * Indicates that current Elasticsearch connection configuration isn't valid or not sufficient.
   */
  NotConfigured = 'not-configured',
}
