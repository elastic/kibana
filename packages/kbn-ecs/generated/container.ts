/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Container fields are used for meta information about the specific container that is the source of information.
 * These fields help correlate data based containers from any runtime.
 */
export interface EcsContainer {
  cpu?: {
    /**
     * Percent CPU used which is normalized by the number of CPU cores and it ranges from 0 to 1. Scaling factor: 1000.
     */
    usage?: number;
  };

  disk?: {
    read?: {
      /**
       * The total number of bytes (gauge) read successfully (aggregated from all disks) since the last metric collection.
       */
      bytes?: number;
    };

    write?: {
      /**
       * The total number of bytes (gauge) written successfully (aggregated from all disks) since the last metric collection.
       */
      bytes?: number;
    };
  };

  /**
   * Unique container id.
   */
  id?: string;
  image?: {
    hash?: {
      /**
       * An array of digests of the image the container was built on. Each digest consists of the hash algorithm and value in this format: `algorithm:value`. Algorithm names should align with the field names in the ECS hash field set.
       */
      all?: string[];
    };

    /**
     * Name of the image the container was built on.
     */
    name?: string;
    /**
     * Container image tags.
     */
    tag?: string[];
  };

  /**
   * Image labels.
   */
  labels?: Record<string, unknown>;
  memory?: {
    /**
     * Memory usage percentage and it ranges from 0 to 1. Scaling factor: 1000.
     */
    usage?: number;
  };

  /**
   * Container name.
   */
  name?: string;
  network?: {
    egress?: {
      /**
       * The number of bytes (gauge) sent out on all network interfaces by the container since the last metric collection.
       */
      bytes?: number;
    };

    ingress?: {
      /**
       * The number of bytes received (gauge) on all network interfaces by the container since the last metric collection.
       */
      bytes?: number;
    };
  };

  /**
   * Runtime managing this container.
   */
  runtime?: string;
}
