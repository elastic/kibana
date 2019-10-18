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
 * Allows retrieving and setting key/value pairs on a Github Issue. Keys and values must be JSON-serializable.
 * Derived from https://github.com/probot/metadata/blob/6ae1523d5035ba727d09c0e7f77a6a154d9a4777/index.js
 *
 * `body` is a string that contains markdown and any existing metadata (eg. an issue or comment body)
 * `prefix` is a string that can be used to namespace the metadata, defaults to `ci`.
 *
 *
 * @notice
 * This product bundles code based on probot-metadata@1.0.0 which is
 * available under a "MIT" license.
 *
 * ISC License
 *
 * Copyright (c) 2017 Brandon Keepers
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

const PREFIX = 'failed-test';
const REGEX = /\n\n<!-- kibanaCiData = (.*) -->/;

function safeJsonParse(json: string, onError: any) {
  try {
    return JSON.parse(json);
  } catch {
    return onError;
  }
}

/**
 * Parse metadata from issue body
 */
export function getIssueMetadata(body: string, key: string, defaultValue: any = undefined) {
  const match = body.match(REGEX);

  if (match) {
    const data = safeJsonParse(match[1], {})[PREFIX];
    return data && data[key] !== undefined ? data[key] : defaultValue;
  } else {
    return defaultValue;
  }
}

/**
 * Set data on the body.
 */
export function updateIssueMetadata(body: string, values: Record<string, any>) {
  if (REGEX.test(body)) {
    return body.replace(REGEX, (match, json) => {
      const data = safeJsonParse(json, {});
      data[PREFIX] = Object.assign(data[PREFIX] || {}, values);
      return match.replace(json, JSON.stringify(data));
    });
  }

  return `${body}\n\n<!-- kibanaCiData = ${JSON.stringify({ [PREFIX]: values })} -->`;
}
