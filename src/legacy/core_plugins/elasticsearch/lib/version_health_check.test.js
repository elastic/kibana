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
import { versionHealthCheck } from './version_health_check';
import { Subject } from 'rxjs';

describe('plugins/elasticsearch', () => {
  describe('lib/health_version_check', function () {
    let plugin;
    let logWithMetadata;

    beforeEach(() => {
      plugin = {
        status: {
          red: jest.fn(),
          green: jest.fn(),
          yellow: jest.fn(),
        },
      };

      logWithMetadata = jest.fn();
      jest.clearAllMocks();
    });

    it('returned promise resolves when all nodes are compatible ', function () {
      const esNodesCompatibility$ = new Subject();
      const versionHealthyPromise = versionHealthCheck(
        plugin,
        logWithMetadata,
        esNodesCompatibility$
      );
      esNodesCompatibility$.next({ isCompatible: true, message: undefined });
      return expect(versionHealthyPromise).resolves.toBe(undefined);
    });

    it('should set elasticsearch plugin status to green when all nodes are compatible', function () {
      const esNodesCompatibility$ = new Subject();
      versionHealthCheck(plugin, logWithMetadata, esNodesCompatibility$);
      expect(plugin.status.yellow).toHaveBeenCalledWith('Waiting for Elasticsearch');
      expect(plugin.status.green).not.toHaveBeenCalled();
      esNodesCompatibility$.next({ isCompatible: true, message: undefined });
      expect(plugin.status.green).toHaveBeenCalledWith('Ready');
      expect(plugin.status.red).not.toHaveBeenCalled();
    });

    it('should set elasticsearch plugin status to red when some nodes are incompatible', function () {
      const esNodesCompatibility$ = new Subject();
      versionHealthCheck(plugin, logWithMetadata, esNodesCompatibility$);
      expect(plugin.status.yellow).toHaveBeenCalledWith('Waiting for Elasticsearch');
      expect(plugin.status.red).not.toHaveBeenCalled();
      esNodesCompatibility$.next({ isCompatible: false, message: 'your nodes are incompatible' });
      expect(plugin.status.red).toHaveBeenCalledWith('your nodes are incompatible');
      expect(plugin.status.green).not.toHaveBeenCalled();
    });
  });
});
