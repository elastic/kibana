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

interface ParsedError {
  message: string;
  cause: string[];
}

const getCause = (obj: any = {}, causes: string[] = []): string[] => {
  const updated = [...causes];

  if (obj.caused_by) {
    updated.push(obj.caused_by.reason);

    // Recursively find all the "caused by" reasons
    return getCause(obj.caused_by, updated);
  }

  return updated.filter(Boolean);
};

export const parseEsError = (err: string): ParsedError => {
  try {
    const { error } = JSON.parse(err);
    const cause = getCause(error);
    return {
      message: error.reason,
      cause,
    };
  } catch (e) {
    return {
      message: err,
      cause: [],
    };
  }
};
