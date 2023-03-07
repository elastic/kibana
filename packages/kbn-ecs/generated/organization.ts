/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * The organization fields enrich data with information about the company or entity the data is associated with.
 * These fields help you arrange or filter data stored in an index by one or multiple organizations.
 */
export interface EcsOrganization {
  /**
   * Unique identifier for the organization.
   */
  id?: string;
  /**
   * Organization name.
   */
  name?: string;
}
