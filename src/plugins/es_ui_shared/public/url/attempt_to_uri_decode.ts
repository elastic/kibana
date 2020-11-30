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

/*
 * Use this function with any match params coming from react router to safely decode values.
 * After an update to react router v6, this functions should be deprecated.
 * Known issue for navigation with special characters in paths
 * https://github.com/elastic/kibana/issues/82440
 */
export const attemptToURIDecode = (value?: string): string | undefined => {
  let result = value;
  try {
    result = value ? decodeURIComponent(value) : value;
  } catch (e) {
    // do nothing
  }
  return result;
};
