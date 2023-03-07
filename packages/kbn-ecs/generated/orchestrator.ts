/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Fields that describe the resources which container orchestrators manage or act upon.
 */
export interface EcsOrchestrator {
  /**
   * API version being used to carry out the action
   */
  api_version?: string;
  cluster?: {
    /**
     * Unique ID of the cluster.
     */
    id?: string;
    /**
     * Name of the cluster.
     */
    name?: string;
    /**
     * URL of the API used to manage the cluster.
     */
    url?: string;
    /**
     * The version of the cluster.
     */
    version?: string;
  };

  /**
   * Namespace in which the action is taking place.
   */
  namespace?: string;
  /**
   * Organization affected by the event (for multi-tenant orchestrator setups).
   */
  organization?: string;
  resource?: {
    /**
     * Unique ID of the resource being acted upon.
     */
    id?: string;
    /**
     * IP address assigned to the resource associated with the event being observed. In the case of a Kubernetes Pod, this array would contain only one element: the IP of the Pod (as opposed to the Node on which the Pod is running).
     */
    ip?: string[];
    /**
     * Name of the resource being acted upon.
     */
    name?: string;
    parent?: {
      /**
       * Type or kind of the parent resource associated with the event being observed. In Kubernetes, this will be the name of a built-in workload resource (e.g., Deployment, StatefulSet, DaemonSet).
       */
      type?: string;
    };

    /**
     * Type of resource being acted upon.
     */
    type?: string;
  };

  /**
   * Orchestrator cluster type (e.g. kubernetes, nomad or cloudfoundry).
   */
  type?: string;
}
