/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { IContextProvider, IContextContainer } from '../context';
import { KibanaRequest, KibanaResponseFactory, KibanaResponse } from './router';

/**
 * Plugin specific context passed to a route handler.
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RequestHandlerContext {}

/**
 * A list of RequestHandlerContext object keys.
 * @public
 */
export type RequestHandlerContextNames = keyof RequestHandlerContext;

/**
 * Parameters passed to the request handler function.
 * @public
 */
export type RequestHandlerParams = [KibanaRequest, KibanaResponseFactory];

/**
 * Expected outcome the request handler function.
 * @public
 */
export type RequestHandlerReturn = KibanaResponse;

/**
 * An object that handles registration of http request context providers.
 * @public
 */
export type RequestHandlerContextContainer = IContextContainer<
  RequestHandlerContext,
  RequestHandlerReturn | Promise<RequestHandlerReturn>,
  RequestHandlerParams
>;

/**
 * Context provider for request handler.
 * Extends request context object with provided functionality or data.
 *
 * @public
 */
export type RequestHandlerContextProvider = IContextProvider<
  RequestHandlerContext,
  RequestHandlerContextNames,
  RequestHandlerParams
>;
