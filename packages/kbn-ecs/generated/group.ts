/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * The group fields are meant to represent groups that are relevant to the event.
 */
export interface EcsGroup {
  /**
   * Name of the directory the group is a member of.
   * For example, an LDAP or Active Directory domain name.
   */
  domain?: string;
  /**
   * Unique identifier for the group on the system/platform.
   */
  id?: string;
  /**
   * Name of the group.
   */
  name?: string;
}
