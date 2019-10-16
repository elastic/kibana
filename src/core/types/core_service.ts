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

/** @public */
export type AnyFunction = (...args: any[]) => any;

/** @public */
export interface Service<
  TSetup extends AnyFunction = AnyFunction,
  TStart extends AnyFunction = AnyFunction
> {
  setup: TSetup;
  start: TStart;
  stop(): void;
}

/**
 * Utility type for inferring the concrete type of a {@link Service}.
 *
 * @remarks
 * TSDoc comments will be preserved and accessible in editors when using this utility type.
 *
 * @example
 * ```ts
 * // Implement the `Service` interface without having to specify the generics type arguments.
 * export class MyService implements Service {
 *  setup(x: number) { return 3 * x }
 *  start() {}
 *  stop() {}
 * }
 *
 * // Use `ServiceType` to export an interface that automatically infers the generic type arguments.
 * export type IMyService = ServiceType<MyService>;
 * // ⇒ Service<(x: number) => number, () => void>
 * ```
 *
 * @public
 */
export type ServiceType<T extends Service<any, any>> = T extends Service<infer TSetup, infer TStart>
  ? Service<TSetup, TStart>
  : never;
