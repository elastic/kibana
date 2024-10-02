/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import getOsSync from 'getos';
import { promisify } from 'util';

const getOs = promisify(getOsSync);

const distroSupportsUnprivilegedUsernamespaces = (distro: string) => {
  // Debian 7 and 8 don't support user namespaces by default
  // this should be reevaluated when Debian 9 is available
  if (distro.toLowerCase() === 'debian') {
    return false;
  }

  // Starting at CentOS 7.2 usernamespaces are in the kernel
  // but they must be explicitly enabled. This should be reevaluated
  // once CentOS 7.5+ is available
  if (distro.toLowerCase() === 'centos') {
    return false;
  }

  // Tested on OracleLinux 7.4 (which returns 'red hat linux' for distro) and sandboxing failed.
  if (distro.toLowerCase() === 'red hat linux') {
    return false;
  }

  return true;
};

interface OsSummary {
  disableSandbox: boolean;
  os: { os: string; dist?: string; release?: string };
}

export async function getDefaultChromiumSandboxDisabled(): Promise<OsSummary> {
  const os = await getOs();

  let enableSandbox: boolean;
  if (process.env.ELASTIC_CONTAINER) {
    // In the Elastic Docker image, user namespaces is not supported. This is relatively safe since Docker
    // provides a level of isolation. In addition, Chromium is only used to open Kibana URLs within the
    // deployment, which makes it relatively locked down from being able to exploit Chromium.
    enableSandbox = false;
  } else {
    enableSandbox = os.os !== 'linux' || distroSupportsUnprivilegedUsernamespaces(os.dist);
  }

  return { os, disableSandbox: !enableSandbox };
}
