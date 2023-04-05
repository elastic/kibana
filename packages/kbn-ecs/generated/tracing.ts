/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Distributed tracing makes it possible to analyze performance throughout a microservice architecture all in one view. This is accomplished by tracing all of the requests - from the initial web request in the front-end service - to queries made through multiple back-end services.
 * Unlike most field sets in ECS, the tracing fields are *not* nested under the field set name. In other words, the correct field name is `trace.id`, not `tracing.trace.id`, and so on.
 */
export interface EcsTracing {
  span?: {
    /**
     * Unique identifier of the span within the scope of its trace.
     * A span represents an operation within a transaction, such as a request to another service, or a database query.
     */
    id?: string;
  };

  trace?: {
    /**
     * Unique identifier of the trace.
     * A trace groups multiple events like transactions that belong together. For example, a user request handled by multiple inter-connected services.
     */
    id?: string;
  };

  transaction?: {
    /**
     * Unique identifier of the transaction within the scope of its trace.
     * A transaction is the highest level of work measured within a service, such as a request to a server.
     */
    id?: string;
  };
}
