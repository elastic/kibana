/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * The service fields describe the service for or from which the data was collected.
 * These fields help you find and correlate logs for a specific service and version.
 */
export interface EcsService {
  /**
   * Address where data about this service was collected from.
   * This should be a URI, network address (ipv4:port or [ipv6]:port) or a resource path (sockets).
   */
  address?: string;
  /**
   * Identifies the environment where the service is running.
   * If the same service runs in different environments (production, staging, QA, development, etc.), the environment can identify other instances of the same service. Can also group services and applications from the same environment.
   */
  environment?: string;
  /**
   * Ephemeral identifier of this service (if one exists).
   * This id normally changes across restarts, but `service.id` does not.
   */
  ephemeral_id?: string;
  /**
   * Unique identifier of the running service. If the service is comprised of many nodes, the `service.id` should be the same for all nodes.
   * This id should uniquely identify the service. This makes it possible to correlate logs and metrics for one specific service, no matter which particular node emitted the event.
   * Note that if you need to see the events from one specific host of the service, you should filter on that `host.name` or `host.id` instead.
   */
  id?: string;
  /**
   * Name of the service data is collected from.
   * The name of the service is normally user given. This allows for distributed services that run on multiple hosts to correlate the related instances based on the name.
   * In the case of Elasticsearch the `service.name` could contain the cluster name. For Beats the `service.name` is by default a copy of the `service.type` field if no name is specified.
   */
  name?: string;
  node?: {
    /**
     * Name of a service node.
     * This allows for two nodes of the same service running on the same host to be differentiated. Therefore, `service.node.name` should typically be unique across nodes of a given service.
     * In the case of Elasticsearch, the `service.node.name` could contain the unique node name within the Elasticsearch cluster. In cases where the service doesn't have the concept of a node name, the host name or container name can be used to distinguish running instances that make up this service. If those do not provide uniqueness (e.g. multiple instances of the service running on the same host) - the node name can be manually set.
     */
    name?: string;
    /**
     * Deprecated for removal in next major version release. This field will be superseded by `node.roles`.
     * Role of a service node.
     * This allows for distinction between different running roles of the same service.
     * In the case of Kibana, the `service.node.role` could be `ui` or `background_tasks`.
     * In the case of Elasticsearch, the `service.node.role` could be `master` or `data`.
     * Other services could use this to distinguish between a `web` and `worker` role running as part of the service.
     */
    role?: string;
    /**
     * Roles of a service node.
     * This allows for distinction between different running roles of the same service.
     * In the case of Kibana, the `service.node.role` could be `ui` or `background_tasks` or both.
     * In the case of Elasticsearch, the `service.node.role` could be `master` or `data` or both.
     * Other services could use this to distinguish between a `web` and `worker` role running as part of the service.
     */
    roles?: string[];
  };

  origin?: {
    /**
     * Address where data about this service was collected from.
     * This should be a URI, network address (ipv4:port or [ipv6]:port) or a resource path (sockets).
     */
    address?: string;
    /**
     * Identifies the environment where the service is running.
     * If the same service runs in different environments (production, staging, QA, development, etc.), the environment can identify other instances of the same service. Can also group services and applications from the same environment.
     */
    environment?: string;
    /**
     * Ephemeral identifier of this service (if one exists).
     * This id normally changes across restarts, but `service.id` does not.
     */
    ephemeral_id?: string;
    /**
     * Unique identifier of the running service. If the service is comprised of many nodes, the `service.id` should be the same for all nodes.
     * This id should uniquely identify the service. This makes it possible to correlate logs and metrics for one specific service, no matter which particular node emitted the event.
     * Note that if you need to see the events from one specific host of the service, you should filter on that `host.name` or `host.id` instead.
     */
    id?: string;
    /**
     * Name of the service data is collected from.
     * The name of the service is normally user given. This allows for distributed services that run on multiple hosts to correlate the related instances based on the name.
     * In the case of Elasticsearch the `service.name` could contain the cluster name. For Beats the `service.name` is by default a copy of the `service.type` field if no name is specified.
     */
    name?: string;
    node?: {
      /**
       * Name of a service node.
       * This allows for two nodes of the same service running on the same host to be differentiated. Therefore, `service.node.name` should typically be unique across nodes of a given service.
       * In the case of Elasticsearch, the `service.node.name` could contain the unique node name within the Elasticsearch cluster. In cases where the service doesn't have the concept of a node name, the host name or container name can be used to distinguish running instances that make up this service. If those do not provide uniqueness (e.g. multiple instances of the service running on the same host) - the node name can be manually set.
       */
      name?: string;
      /**
       * Deprecated for removal in next major version release. This field will be superseded by `node.roles`.
       * Role of a service node.
       * This allows for distinction between different running roles of the same service.
       * In the case of Kibana, the `service.node.role` could be `ui` or `background_tasks`.
       * In the case of Elasticsearch, the `service.node.role` could be `master` or `data`.
       * Other services could use this to distinguish between a `web` and `worker` role running as part of the service.
       */
      role?: string;
      /**
       * Roles of a service node.
       * This allows for distinction between different running roles of the same service.
       * In the case of Kibana, the `service.node.role` could be `ui` or `background_tasks` or both.
       * In the case of Elasticsearch, the `service.node.role` could be `master` or `data` or both.
       * Other services could use this to distinguish between a `web` and `worker` role running as part of the service.
       */
      roles?: string[];
    };

    /**
     * Current state of the service.
     */
    state?: string;
    /**
     * The type of the service data is collected from.
     * The type can be used to group and correlate logs and metrics from one service type.
     * Example: If logs or metrics are collected from Elasticsearch, `service.type` would be `elasticsearch`.
     */
    type?: string;
    /**
     * Version of the service the data was collected from.
     * This allows to look at a data set only for a specific version of a service.
     */
    version?: string;
  };

  /**
   * Current state of the service.
   */
  state?: string;
  target?: {
    /**
     * Address where data about this service was collected from.
     * This should be a URI, network address (ipv4:port or [ipv6]:port) or a resource path (sockets).
     */
    address?: string;
    /**
     * Identifies the environment where the service is running.
     * If the same service runs in different environments (production, staging, QA, development, etc.), the environment can identify other instances of the same service. Can also group services and applications from the same environment.
     */
    environment?: string;
    /**
     * Ephemeral identifier of this service (if one exists).
     * This id normally changes across restarts, but `service.id` does not.
     */
    ephemeral_id?: string;
    /**
     * Unique identifier of the running service. If the service is comprised of many nodes, the `service.id` should be the same for all nodes.
     * This id should uniquely identify the service. This makes it possible to correlate logs and metrics for one specific service, no matter which particular node emitted the event.
     * Note that if you need to see the events from one specific host of the service, you should filter on that `host.name` or `host.id` instead.
     */
    id?: string;
    /**
     * Name of the service data is collected from.
     * The name of the service is normally user given. This allows for distributed services that run on multiple hosts to correlate the related instances based on the name.
     * In the case of Elasticsearch the `service.name` could contain the cluster name. For Beats the `service.name` is by default a copy of the `service.type` field if no name is specified.
     */
    name?: string;
    node?: {
      /**
       * Name of a service node.
       * This allows for two nodes of the same service running on the same host to be differentiated. Therefore, `service.node.name` should typically be unique across nodes of a given service.
       * In the case of Elasticsearch, the `service.node.name` could contain the unique node name within the Elasticsearch cluster. In cases where the service doesn't have the concept of a node name, the host name or container name can be used to distinguish running instances that make up this service. If those do not provide uniqueness (e.g. multiple instances of the service running on the same host) - the node name can be manually set.
       */
      name?: string;
      /**
       * Deprecated for removal in next major version release. This field will be superseded by `node.roles`.
       * Role of a service node.
       * This allows for distinction between different running roles of the same service.
       * In the case of Kibana, the `service.node.role` could be `ui` or `background_tasks`.
       * In the case of Elasticsearch, the `service.node.role` could be `master` or `data`.
       * Other services could use this to distinguish between a `web` and `worker` role running as part of the service.
       */
      role?: string;
      /**
       * Roles of a service node.
       * This allows for distinction between different running roles of the same service.
       * In the case of Kibana, the `service.node.role` could be `ui` or `background_tasks` or both.
       * In the case of Elasticsearch, the `service.node.role` could be `master` or `data` or both.
       * Other services could use this to distinguish between a `web` and `worker` role running as part of the service.
       */
      roles?: string[];
    };

    /**
     * Current state of the service.
     */
    state?: string;
    /**
     * The type of the service data is collected from.
     * The type can be used to group and correlate logs and metrics from one service type.
     * Example: If logs or metrics are collected from Elasticsearch, `service.type` would be `elasticsearch`.
     */
    type?: string;
    /**
     * Version of the service the data was collected from.
     * This allows to look at a data set only for a specific version of a service.
     */
    version?: string;
  };

  /**
   * The type of the service data is collected from.
   * The type can be used to group and correlate logs and metrics from one service type.
   * Example: If logs or metrics are collected from Elasticsearch, `service.type` would be `elasticsearch`.
   */
  type?: string;
  /**
   * Version of the service the data was collected from.
   * This allows to look at a data set only for a specific version of a service.
   */
  version?: string;
}
