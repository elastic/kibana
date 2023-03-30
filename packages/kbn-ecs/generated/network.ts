/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * The network is defined as the communication path over which a host or network event happens.
 * The network.* fields should be populated with details about the network activity associated with an event.
 */
export interface EcsNetwork {
  /**
   * When a specific application or service is identified from network connection details (source/dest IPs, ports, certificates, or wire format), this field captures the application's or service's name.
   * For example, the original event identifies the network connection being from a specific web service in a `https` network connection, like `facebook` or `twitter`.
   * The field value must be normalized to lowercase for querying.
   */
  application?: string;
  /**
   * Total bytes transferred in both directions.
   * If `source.bytes` and `destination.bytes` are known, `network.bytes` is their sum.
   */
  bytes?: number;
  /**
   * A hash of source and destination IPs and ports, as well as the protocol used in a communication. This is a tool-agnostic standard to identify flows.
   * Learn more at https://github.com/corelight/community-id-spec.
   */
  community_id?: string;
  /**
   * Direction of the network traffic.
   * When mapping events from a host-based monitoring context, populate this field from the host's point of view, using the values "ingress" or "egress".
   * When mapping events from a network or perimeter-based monitoring context, populate this field from the point of view of the network perimeter, using the values "inbound", "outbound", "internal" or "external".
   * Note that "internal" is not crossing perimeter boundaries, and is meant to describe communication between two hosts within the perimeter. Note also that "external" is meant to describe traffic between two hosts that are external to the perimeter. This could for example be useful for ISPs or VPN service providers.
   */
  direction?: string;
  /**
   * Host IP address when the source IP address is the proxy.
   */
  forwarded_ip?: string;
  /**
   * IANA Protocol Number (https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml). Standardized list of protocols. This aligns well with NetFlow and sFlow related logs which use the IANA Protocol Number.
   */
  iana_number?: string;
  /**
   * Network.inner fields are added in addition to network.vlan fields to describe the innermost VLAN when q-in-q VLAN tagging is present. Allowed fields include vlan.id and vlan.name. Inner vlan fields are typically used when sending traffic with multiple 802.1q encapsulations to a network sensor (e.g. Zeek, Wireshark.)
   */
  inner?: Record<string, unknown>;
  /**
   * Name given by operators to sections of their network.
   */
  name?: string;
  /**
   * Total packets transferred in both directions.
   * If `source.packets` and `destination.packets` are known, `network.packets` is their sum.
   */
  packets?: number;
  /**
   * In the OSI Model this would be the Application Layer protocol. For example, `http`, `dns`, or `ssh`.
   * The field value must be normalized to lowercase for querying.
   */
  protocol?: string;
  /**
   * Same as network.iana_number, but instead using the Keyword name of the transport layer (udp, tcp, ipv6-icmp, etc.)
   * The field value must be normalized to lowercase for querying.
   */
  transport?: string;
  /**
   * In the OSI Model this would be the Network Layer. ipv4, ipv6, ipsec, pim, etc
   * The field value must be normalized to lowercase for querying.
   */
  type?: string;
  vlan?: {
    /**
     * VLAN ID as reported by the observer.
     */
    id?: string;
    /**
     * Optional VLAN name as reported by the observer.
     */
    name?: string;
  };
}
