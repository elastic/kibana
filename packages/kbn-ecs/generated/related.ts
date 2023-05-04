/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This field set is meant to facilitate pivoting around a piece of data.
 * Some pieces of information can be seen in many places in an ECS event. To facilitate searching for them, store an array of all seen values to their corresponding field in `related.`.
 * A concrete example is IP addresses, which can be under host, observer, source, destination, client, server, and network.forwarded_ip. If you append all IPs to `related.ip`, you can then search for a given IP trivially, no matter where it appeared, by querying `related.ip:192.0.2.15`.
 */
export interface EcsRelated {
  /**
   * All the hashes seen on your event. Populating this field, then using it to search for hashes can help in situations where you're unsure what the hash algorithm is (and therefore which key name to search).
   */
  hash?: string[];
  /**
   * All hostnames or other host identifiers seen on your event. Example identifiers include FQDNs, domain names, workstation names, or aliases.
   */
  hosts?: string[];
  /**
   * All of the IPs seen on your event.
   */
  ip?: string[];
  /**
   * All the user names or other user identifiers seen on the event.
   */
  user?: string[];
}
