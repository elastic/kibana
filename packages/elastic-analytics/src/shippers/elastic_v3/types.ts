/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Options for the Elastic V3 shipper
 */
export interface ElasticV3ShipperOptions {
  /**
   * The name of the channel to stream all the events to.
   */
  channelName: string;
  /**
   * The product's version.
   */
  version: string;
  /**
   * Should show debug information about the requests it makes to the V3 API.
   */
  debug?: boolean;
}
