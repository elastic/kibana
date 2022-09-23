/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
export interface Metadata {
  /**
   * Cloud metadata about where the monitored service is running.
   */
  cloud?: null | {
    /**
     * Account where the monitored service is running.
     */
    account?: null | {
      /**
       * ID of the cloud account.
       */
      id?: null | string;
      /**
       * Name of the cloud account.
       */
      name?: null | string;
      [k: string]: unknown;
    };
    /**
     * AvailabilityZone where the monitored service is running, e.g. us-east-1a
     */
    availability_zone?: null | string;
    /**
     * Instance on which the monitored service is running.
     */
    instance?: null | {
      /**
       * ID of the cloud instance.
       */
      id?: null | string;
      /**
       * Name of the cloud instance.
       */
      name?: null | string;
      [k: string]: unknown;
    };
    /**
     * Machine on which the monitored service is running.
     */
    machine?: null | {
      /**
       * ID of the cloud machine.
       */
      type?: null | string;
      [k: string]: unknown;
    };
    /**
     * Project in which the monitored service is running.
     */
    project?: null | {
      /**
       * ID of the cloud project.
       */
      id?: null | string;
      /**
       * Name of the cloud project.
       */
      name?: null | string;
      [k: string]: unknown;
    };
    /**
     * Provider that is used, e.g. aws, azure, gcp, digitalocean.
     */
    provider: string;
    /**
     * Region where the monitored service is running, e.g. us-east-1
     */
    region?: null | string;
    /**
     * Service that is monitored on cloud
     */
    service?: null | {
      /**
       * Name of the cloud service, intended to distinguish services running on different platforms within a provider, eg AWS EC2 vs Lambda, GCP GCE vs App Engine, Azure VM vs App Server.
       */
      name?: null | string;
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
  /**
   * Labels are a flat mapping of user-defined tags. Allowed value types are string, boolean and number values. Labels are indexed and searchable.
   */
  labels?: null | {
    [k: string]: null | string | boolean | number;
  };
  /**
   * Network holds information about the network over which the monitored service is communicating.
   */
  network?: null | {
    connection?: null | {
      type?: null | string;
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
  /**
   * Process metadata about the monitored service.
   */
  process?: null | {
    /**
     * Argv holds the command line arguments used to start this process.
     */
    argv?: null | string[];
    /**
     * PID holds the process ID of the service.
     */
    pid: number;
    /**
     * Ppid holds the parent process ID of the service.
     */
    ppid?: null | number;
    /**
     * Title is the process title. It can be the same as process name.
     */
    title?: null | string;
    [k: string]: unknown;
  };
  /**
   * Service metadata about the monitored service.
   */
  service: {
    /**
     * Agent holds information about the APM agent capturing the event.
     */
    agent: {
      /**
       * EphemeralID is a free format ID used for metrics correlation by agents
       */
      ephemeral_id?: null | string;
      /**
       * Name of the APM agent capturing information.
       */
      name: string;
      /**
       * Version of the APM agent capturing information.
       */
      version: string;
      [k: string]: unknown;
    };
    /**
     * Environment in which the monitored service is running, e.g. `production` or `staging`.
     */
    environment?: null | string;
    /**
     * Framework holds information about the framework used in the monitored service.
     */
    framework?: null | {
      /**
       * Name of the used framework
       */
      name?: null | string;
      /**
       * Version of the used framework
       */
      version?: null | string;
      [k: string]: unknown;
    };
    /**
     * ID holds a unique identifier for the running service.
     */
    id?: null | string;
    /**
     * Language holds information about the programming language of the monitored service.
     */
    language?: null | {
      /**
       * Name of the used programming language
       */
      name: string;
      /**
       * Version of the used programming language
       */
      version?: null | string;
      [k: string]: unknown;
    };
    /**
     * Name of the monitored service.
     */
    name: string;
    /**
     * Node must be a unique meaningful name of the service node.
     */
    node?: null | {
      /**
       * Name of the service node
       */
      configured_name?: null | string;
      [k: string]: unknown;
    };
    /**
     * Runtime holds information about the language runtime running the monitored service
     */
    runtime?: null | {
      /**
       * Name of the language runtime
       */
      name: string;
      /**
       * Name of the language runtime
       */
      version: string;
      [k: string]: unknown;
    };
    /**
     * Version of the monitored service.
     */
    version?: null | string;
    [k: string]: unknown;
  };
  /**
   * System metadata
   */
  system?: null | {
    /**
     * Architecture of the system the monitored service is running on.
     */
    architecture?: null | string;
    /**
     * ConfiguredHostname is the configured name of the host the monitored service is running on. It should only be sent when configured by the user. If given, it is used as the event's hostname.
     */
    configured_hostname?: null | string;
    /**
     * Container holds the system's container ID if available.
     */
    container?: null | {
      /**
       * ID of the container the monitored service is running in.
       */
      id?: null | string;
      [k: string]: unknown;
    };
    /**
     * DetectedHostname is the hostname detected by the APM agent. It usually contains what the hostname command returns on the host machine. It will be used as the event's hostname if ConfiguredHostname is not present.
     */
    detected_hostname?: null | string;
    /**
     * Deprecated: Use ConfiguredHostname and DetectedHostname instead. DeprecatedHostname is the host name of the system the service is running on. It does not distinguish between configured and detected hostname and therefore is deprecated and only used if no other hostname information is available.
     */
    hostname?: null | string;
    /**
     * Kubernetes system information if the monitored service runs on Kubernetes.
     */
    kubernetes?: null | {
      /**
       * Namespace of the Kubernetes resource the monitored service is run on.
       */
      namespace?: null | string;
      /**
       * Node related information
       */
      node?: null | {
        /**
         * Name of the Kubernetes Node
         */
        name?: null | string;
        [k: string]: unknown;
      };
      /**
       * Pod related information
       */
      pod?: null | {
        /**
         * Name of the Kubernetes Pod
         */
        name?: null | string;
        /**
         * UID is the system-generated string uniquely identifying the Pod.
         */
        uid?: null | string;
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };
    /**
     * Platform name of the system platform the monitored service is running on.
     */
    platform?: null | string;
    [k: string]: unknown;
  };
  /**
   * User metadata, which can be overwritten on a per event basis.
   */
  user?: null | {
    /**
     * Domain of the logged in user
     */
    domain?: null | string;
    /**
     * Email of the user.
     */
    email?: null | string;
    /**
     * ID identifies the logged in user, e.g. can be the primary key of the user
     */
    id?: null | string | number;
    /**
     * Name of the user.
     */
    username?: null | string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
