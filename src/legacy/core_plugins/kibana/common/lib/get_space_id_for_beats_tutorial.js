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
 * Returns valid configuration for a beat.yml file for adding the space id
 * if there is an active space and that space is not the default one.
 *
 * @param {object} context - Context object generated from tutorial factory (see #22760)
 */
export function getSpaceIdForBeatsTutorial(context) {
  if (!context || !context.spaceId || context.isInDefaultSpace) {
    return '';
  }

  return `  space.id: "${context.spaceId}"`;
}
