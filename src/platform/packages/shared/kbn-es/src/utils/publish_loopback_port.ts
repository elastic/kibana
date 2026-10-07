/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hasIpv6Loopback } from './has_ipv6_loopback';

/**
 * Build the `docker run` flags publishing a container port on the host loopback.
 *
 * Clients reach these containers by the `localhost` hostname rather than by address, so the
 * published address has to cover whatever that name resolves to. Under the IPv6-only CI mode
 * `localhost` resolves to `::1` and to nothing else, and a container published on `127.0.0.1`
 * alone has nothing listening where those clients connect.
 *
 * The IPv6 publish is added only where the host actually carries `::1`: Docker binds the host side
 * of the mapping at container startup, so requesting an address the host does not have fails the
 * container rather than being ignored. Elsewhere it is not needed anyway — `localhost` keeps an
 * IPv4 address there, and Node falls back across families on connect.
 *
 * The IPv4 publish must stay first: `runServerlessCluster` derives the ES client URL by slicing
 * element 1 of `resolvePort`'s output, and an IP literal is what keeps it clear of the certificate
 * hostname check.
 */
export const publishLoopbackPort = (
  hostPort: string | number,
  containerPort: string | number = hostPort
): string[] => {
  const publish = ['-p', `127.0.0.1:${hostPort}:${containerPort}`];

  if (hasIpv6Loopback()) {
    publish.push('-p', `[::1]:${hostPort}:${containerPort}`);
  }

  return publish;
};
