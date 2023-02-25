/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server'
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import type { CreateFileArgs } from '../file_service/file_action_types';

/**
 * Represents a single RPC method. The `In` and `Out` types are the input and
 * output types of the method.
 */
export type FileRpcMethod<In, Out> = (req: FileRpcRequest<In>) => Promise<FileRpcResponse<Out>>;

/**
 * Represents the input object of a {@link FileRpcMethod}.
 */
export interface FileRpcRequest<Data = unknown> {
  /**
   * The context of the request. Should contain information about connection,
   * authentication, etc.
   */
  ctx: FileRpcRequestContext;

  /**
   * Custom data, different for each method.
   */
  data: Data;
}

/**
 * The context of the request. Should contain information about connection,
 * authentication, etc. This object allows to abstract away the underlying
 * transport layer, currently it uses {@link KibanaRequest}, but in the future
 * it can be changed to something else.
 */
export interface FileRpcRequestContext {
  /**
   * Kibana HTTP request object.
   */
  req: KibanaRequest;

  /**
   * The authenticated user, if any, on whose behalf the request is being made.
   */
  user?: AuthenticatedUser | null;
}

/**
 * Represents the output object of a {@link FileRpcMethod}.
 */
export interface FileRpcResponse<Data = unknown> {
  /**
   * Custom data, different for each method.
   */
  data: Data;

  /**
   * Custom HTTP status code, used for compatibility with HTTP network layers.
   * If not specified, assumes 200.
   */
  httpCode?: number;
}

/**
 * Represents an error that can be returned by a {@link FileRpcMethod}.
 */
export interface FileRpcError {
  /**
   * Human readable error message. Usually, the `.message` property of the
   * {@link Error} object.
   */
  message: string;

  /**
   * Error code, technical identifier of the error. Does not have to be human
   * readable.
   */
  code?: string;

  /**
   * Custom HTTP status code, used for compatibility with HTTP network layers.
   * If not specified, assumes 400.
   */
  httpCode?: number;
}

/**
 * Represents a set of hooks that can be used to modify the behavior of the
 * {@link FileRpcService}. If a hook is defined, it will be called in a specific
 * place in the RPC method execution.
 * 
 * The hook succeeds only when it returns `true`. If the hook does not return
 * `true`, the execution of the method will be aborted with
 * {@link FileRpcErrorHookFailed} error. If the hook throws and error, which is
 * not an instance of {@link FileRpcErrorGeneral}, the error will be re-thrown
 * as {@link FileRpcErrorHookFailed}.
 */
export interface FileRpcServiceHooks {
  onCreateStart: (req: FileRpcRequest<Omit<CreateFileArgs, 'user'>>) => boolean;
  onBeforeCreate: (req: CreateFileArgs) => boolean;
}

/**
 * List of methods that File RPC service supports.
 */
export interface FileRpcMethods {
  /**
   * See {@link FileMetadataClient.create}. Creates a file and returns the
   * {@link File} object.
   * */
  create: FileRpcMethod<Omit<CreateFileArgs, 'user'>, {file: FileJSON}>;
}
