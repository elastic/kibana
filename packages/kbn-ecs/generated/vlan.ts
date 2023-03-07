/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * The VLAN fields are used to identify 802.1q tag(s) of a packet, as well as ingress and egress VLAN associations of an observer in relation to a specific packet or connection.
 * Network.vlan fields are used to record a single VLAN tag, or the outer tag in the case of q-in-q encapsulations, for a packet or connection as observed, typically provided by a network sensor (e.g. Zeek, Wireshark) passively reporting on traffic.
 * Network.inner VLAN fields are used to report inner q-in-q 802.1q tags (multiple 802.1q encapsulations) as observed, typically provided by a network sensor  (e.g. Zeek, Wireshark) passively reporting on traffic. Network.inner VLAN fields should only be used in addition to network.vlan fields to indicate q-in-q tagging.
 * Observer.ingress and observer.egress VLAN values are used to record observer specific information when observer events contain discrete ingress and egress VLAN information, typically provided by firewalls, routers, or load balancers.
 */
export interface EcsVlan {
  /**
   * VLAN ID as reported by the observer.
   */
  id?: string;
  /**
   * Optional VLAN name as reported by the observer.
   */
  name?: string;
}
