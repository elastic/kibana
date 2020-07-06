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

import { Logger } from '../../logging';
import { LegacyPluginSpec } from '../types';

const internalPaths = ['/src/legacy/core_plugins', '/x-pack'];

// Use shortened URLs so destinations can be updated if/when documentation moves
// All platform team members have access to edit these
const breakingChangesUrl = 'https://ela.st/kibana-breaking-changes-8-0';
const migrationGuideUrl = 'https://ela.st/kibana-platform-migration';

export const logLegacyThirdPartyPluginDeprecationWarning = ({
  specs,
  log,
}: {
  specs: LegacyPluginSpec[];
  log: Logger;
}) => {
  const thirdPartySpecs = specs.filter(isThirdPartyPluginSpec);
  if (thirdPartySpecs.length > 0) {
    const pluginIds = thirdPartySpecs.map((spec) => spec.getId());
    log.warn(
      `Some installed third party plugin(s) [${pluginIds.join(
        ', '
      )}] are using the legacy plugin format and will no longer work in a future Kibana release. ` +
        `Please refer to ${breakingChangesUrl} for a list of breaking changes ` +
        `and ${migrationGuideUrl} for documentation on how to migrate legacy plugins.`
    );
  }
};

const isThirdPartyPluginSpec = (spec: LegacyPluginSpec): boolean => {
  const pluginPath = spec.getPack().getPath();
  return !internalPaths.some((internalPath) => pluginPath.indexOf(internalPath) > -1);
};
