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

// TODO inline all of these
import { Type, TypeOf } from '@kbn/config-schema';
import { Env } from './env';

/**
 * Interface that defines the static side of a config class.
 *
 * (Remember that a class has two types: the type of the static side and the
 * type of the instance side, see https://www.typescriptlang.org/docs/handbook/interfaces.html#difference-between-the-static-and-instance-sides-of-classes)
 *
 * This can't be used to define the config class because of how interfaces work
 * in TypeScript, but it can be used to ensure we have a config class that
 * matches whenever it's used.
 */
export interface ConfigWithSchema<S extends Type<any>, Config> {
  /**
   * Any config class must define a schema that validates the config, based on
   * the injected `schema` helper.
   */
  schema: S;

  /**
   * @param validatedConfig The result of validating the static `schema` above.
   * @param env An instance of the `Env` class that defines environment specific
   * variables.
   */
  new (validatedConfig: TypeOf<S>, env: Env): Config;
}
