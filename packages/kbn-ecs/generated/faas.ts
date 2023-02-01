/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * The user fields describe information about the function as a service (FaaS) that is relevant to the event.
 */
export interface EcsFaas {
  /**
   * Boolean value indicating a cold start of a function.
   */
  coldstart?: boolean;
  /**
   * The execution ID of the current function execution.
   */
  execution?: string;
  /**
   * The unique identifier of a serverless function.
   * For AWS Lambda it's the function ARN (Amazon Resource Name) without a version or alias suffix.
   */
  id?: string;
  /**
   * The name of a serverless function.
   */
  name?: string;
  /**
   * Details about the function trigger.
   */
  trigger?: Record<string, unknown>;
  /**
   * The version of a serverless function.
   */
  version?: string;
}
