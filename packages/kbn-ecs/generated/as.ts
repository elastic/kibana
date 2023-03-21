/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * An autonomous system (AS) is a collection of connected Internet Protocol (IP) routing prefixes under the control of one or more network operators on behalf of a single administrative entity or domain that presents a common, clearly defined routing policy to the internet.
 */
export interface EcsAs {
  /**
   * Unique number allocated to the autonomous system. The autonomous system number (ASN) uniquely identifies each network on the Internet.
   */
  number?: number;
  organization?: {
    /**
     * Organization name.
     */
    name?: string;
  };
}
