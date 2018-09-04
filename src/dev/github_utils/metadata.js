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

const REGEX = /\n\n<!-- kibanaCiData = (.*) -->/;

/**
 * Allows retrieving and setting key/value pairs on a Github Issue. Keys and values must be JSON-serializable.
 * Borrowed heavily from https://github.com/probot/metadata/blob/6ae1523d5035ba727d09c0e7f77a6a154d9a4777/index.js
 *
 * `body` is a string that contains markdown and any existing metadata (eg. an issue or comment body)
 * `prefix` is a string that can be used to namespace the metadata, defaults to `ci`.
 */
export const markdownMetadata = {
  get(body, key = null, prefix = 'failed-test') {
    const match = body.match(REGEX);

    if (match) {
      const data = JSON.parse(match[1])[prefix];
      return key ? data && data[key] : data;
    } else {
      return null;
    }
  },

  /**
   * Set data on the body. Can either be set individually with `key` and `value` OR
   */
  set(body, key, value, prefix = 'failed-test') {
    let newData = {};
    // If second arg is an object, use all supplied values.
    if (typeof key === 'object') {
      newData = key;
      prefix = value || prefix;  // need to move third arg to prefix.
    } else {
      newData[key] = value;
    }

    let data = {};

    body = body.replace(REGEX, (_, json) => {
      data = JSON.parse(json);
      return '';
    });

    if (!data[prefix]) data[prefix] = {};

    Object.assign(data[prefix], newData);

    return `${body}\n\n<!-- kibanaCiData = ${JSON.stringify(data)} -->`;
  }
};
