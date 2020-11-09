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

import { isClusterOptedIn } from './util';

const createMockClusterUsage = (plugins: any) => {
  return {
    stack_stats: {
      kibana: { plugins },
    },
  };
};

describe('isClusterOptedIn', () => {
  it('returns true if cluster has opt_in_status: true', () => {
    const mockClusterUsage = createMockClusterUsage({ telemetry: { opt_in_status: true } });
    const result = isClusterOptedIn(mockClusterUsage);
    expect(result).toBe(true);
  });
  it('returns false if cluster has opt_in_status: false', () => {
    const mockClusterUsage = createMockClusterUsage({ telemetry: { opt_in_status: false } });
    const result = isClusterOptedIn(mockClusterUsage);
    expect(result).toBe(false);
  });
  it('returns false if cluster has opt_in_status: undefined', () => {
    const mockClusterUsage = createMockClusterUsage({ telemetry: {} });
    const result = isClusterOptedIn(mockClusterUsage);
    expect(result).toBe(false);
  });
  it('returns false if cluster stats is malformed', () => {
    expect(isClusterOptedIn(createMockClusterUsage({}))).toBe(false);
    expect(isClusterOptedIn({})).toBe(false);
    expect(isClusterOptedIn(undefined)).toBe(false);
  });
});
