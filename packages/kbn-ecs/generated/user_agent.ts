/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * The user_agent fields normally come from a browser request.
 * They often show up in web service logs coming from the parsed user agent string.
 */
export interface EcsUserAgent {
  device?: {
    /**
     * Name of the device.
     */
    name?: string;
  };

  /**
   * Name of the user agent.
   */
  name?: string;
  /**
   * Unparsed user_agent string.
   */
  original?: string;
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
   * Version of the user agent.
   */
  version?: string;
}
