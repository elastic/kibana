/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function applyFipsOverrides(vars: any) {
  if (process.env.FTR_ENABLE_FIPS_AGENT?.toLowerCase() === 'true') {
    vars.esTestCluster.license = 'trial';

    const skipTags = vars.suiteTags?.exclude ?? [];
    skipTags.push('skipFIPS');
    vars.suiteTags = {
      ...vars.suiteTags,
      exclude: skipTags,
    };

    vars.security = {
      ...vars.security,
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
  }
  return vars;
}
