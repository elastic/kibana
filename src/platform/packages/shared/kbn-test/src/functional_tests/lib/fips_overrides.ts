/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// This will only apply overrides when running in FIPS mode
export function applyFipsOverrides(vars: any) {
  vars.esTestCluster.license = 'trial';

  const skipTags = vars.suiteTags?.exclude ?? [];
  skipTags.push('skipFIPS');
  vars.suiteTags = {
    ...vars.suiteTags,
    exclude: skipTags,
  };

  vars.security = {
    ...vars.security,
    /*
     * When running in FIPS mode, security must be enabled. Many suites expect that there will be no authc/authz.
     * Test user's roles are set to `defaultRoles`, the most privileged roles are added here
     *  so that more tests can be run successfully
     */
    defaultRoles: ['superuser', 'kibana_admin', 'system_indices_superuser'],
  };

  const newServerArgs = vars.esTestCluster.serverArgs.filter(
    (arg: string) => arg !== 'xpack.security.enabled=false'
  );
  newServerArgs.push('xpack.security.enabled=true');

  const selfTypedBasicLicenseIndex = newServerArgs.indexOf(
    `xpack.license.self_generated.type=basic`
  );
  if (selfTypedBasicLicenseIndex > -1) {
    newServerArgs[selfTypedBasicLicenseIndex] = `xpack.license.self_generated.type=trial`;
  }

  vars.esTestCluster.serverArgs = newServerArgs;

  return vars;
}
