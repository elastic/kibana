/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * An observer is defined as a special network, security, or application device used to detect, observe, or create network, security, or application-related events and metrics.
 * This could be a custom hardware appliance or a server that has been configured to run special network, security, or application software. Examples include firewalls, web proxies, intrusion detection/prevention systems, network monitoring sensors, web application firewalls, data loss prevention systems, and APM servers. The observer.* fields shall be populated with details of the system, if any, that detects, observes and/or creates a network, security, or application event or metric. Message queues and ETL components used in processing events or metrics are not considered observers in ECS.
 */
export interface EcsObserver {
  /**
   * Observer.egress holds information like interface number and name, vlan, and zone information to classify egress traffic.  Single armed monitoring such as a network sensor on a span port should only use observer.ingress to categorize traffic.
   */
  egress?: Record<string, unknown>;
  geo?: {
    /**
     * City name.
     */
    city_name?: string;
    /**
     * Two-letter code representing continent's name.
     */
    continent_code?: string;
    /**
     * Name of the continent.
     */
    continent_name?: string;
    /**
     * Country ISO code.
     */
    country_iso_code?: string;
    /**
     * Country name.
     */
    country_name?: string;
    /**
     * Longitude and latitude.
     */
    location?: { lat: number; lon: number };
    /**
     * User-defined description of a location, at the level of granularity they care about.
     * Could be the name of their data centers, the floor number, if this describes a local physical entity, city names.
     * Not typically used in automated geolocation.
     */
    name?: string;
    /**
     * Postal code associated with the location.
     * Values appropriate for this field may also be known as a postcode or ZIP code and will vary widely from country to country.
     */
    postal_code?: string;
    /**
     * Region ISO code.
     */
    region_iso_code?: string;
    /**
     * Region name.
     */
    region_name?: string;
    /**
     * The time zone of the location, such as IANA time zone name.
     */
    timezone?: string;
  };

  /**
   * Hostname of the observer.
   */
  hostname?: string;
  /**
   * Observer.ingress holds information like interface number and name, vlan, and zone information to classify ingress traffic.  Single armed monitoring such as a network sensor on a span port should only use observer.ingress to categorize traffic.
   */
  ingress?: Record<string, unknown>;
  /**
   * IP addresses of the observer.
   */
  ip?: string[];
  /**
   * MAC addresses of the observer.
   * The notation format from RFC 7042 is suggested: Each octet (that is, 8-bit byte) is represented by two [uppercase] hexadecimal digits giving the value of the octet as an unsigned integer. Successive octets are separated by a hyphen.
   */
  mac?: string[];
  /**
   * Custom name of the observer.
   * This is a name that can be given to an observer. This can be helpful for example if multiple firewalls of the same model are used in an organization.
   * If no custom name is needed, the field can be left empty.
   */
  name?: string;
  os?: {
    /**
     * OS family (such as redhat, debian, freebsd, windows).
     */
    family?: string;
    /**
     * Operating system name, including the version or code name.
     */
    full?: string;
    /**
     * Operating system kernel version as a raw string.
     */
    kernel?: string;
    /**
     * Operating system name, without the version.
     */
    name?: string;
    /**
     * Operating system platform (such centos, ubuntu, windows).
     */
    platform?: string;
    /**
     * Use the `os.type` field to categorize the operating system into one of the broad commercial families.
     * If the OS you're dealing with is not listed as an expected value, the field should not be populated. Please let us know by opening an issue with ECS, to propose its addition.
     */
    type?: string;
    /**
     * Operating system version as a raw string.
     */
    version?: string;
  };

  /**
   * The product name of the observer.
   */
  product?: string;
  /**
   * Observer serial number.
   */
  serial_number?: string;
  /**
   * The type of the observer the data is coming from.
   * There is no predefined list of observer types. Some examples are `forwarder`, `firewall`, `ids`, `ips`, `proxy`, `poller`, `sensor`, `APM server`.
   */
  type?: string;
  /**
   * Vendor name of the observer.
   */
  vendor?: string;
  /**
   * Observer version.
   */
  version?: string;
}
