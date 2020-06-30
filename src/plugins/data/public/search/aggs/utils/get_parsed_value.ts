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

/**
 * This method parses a JSON string and constructs the Object or object described by the string.
 * If the given string is not valid JSON, you will get a syntax error.
 * @param data { Object } - an object that contains the required for parsing field
 * @param key { string} - name of the field to be parsed
 *
 * @internal
 */
export const getParsedValue = (data: any, key: string) => {
  try {
    return data[key] ? JSON.parse(data[key]) : undefined;
  } catch (e) {
    throw new Error(`Unable to parse ${key} argument string`);
  }
};
