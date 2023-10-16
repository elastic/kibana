/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Rule fields are used to capture the specifics of any observer or agent rules that generate alerts or other notable events.
 * Examples of data sources that would populate the rule fields include: network admission control platforms, network or host IDS/IPS, network firewalls, web application firewalls, url filters, endpoint detection and response (EDR) systems, etc.
 */
export interface EcsRule {
  /**
   * Name, organization, or pseudonym of the author or authors who created the rule used to generate this event.
   */
  author?: string[];
  /**
   * A categorization value keyword used by the entity using the rule for detection of this event.
   */
  category?: string;
  /**
   * The description of the rule generating the event.
   */
  description?: string;
  /**
   * A rule ID that is unique within the scope of an agent, observer, or other entity using the rule for detection of this event.
   */
  id?: string;
  /**
   * Name of the license under which the rule used to generate this event is made available.
   */
  license?: string;
  /**
   * The name of the rule or signature generating the event.
   */
  name?: string;
  /**
   * Reference URL to additional information about the rule used to generate this event.
   * The URL can point to the vendor's documentation about the rule. If that's not available, it can also be a link to a more general page describing this type of alert.
   */
  reference?: string;
  /**
   * Name of the ruleset, policy, group, or parent category in which the rule used to generate this event is a member.
   */
  ruleset?: string;
  /**
   * A rule ID that is unique within the scope of a set or group of agents, observers, or other entities using the rule for detection of this event.
   */
  uuid?: string;
  /**
   * The version / revision of the rule being used for analysis.
   */
  version?: string;
}
