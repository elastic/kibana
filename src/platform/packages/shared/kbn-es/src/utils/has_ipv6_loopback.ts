/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { networkInterfaces } from 'os';

/**
 * Whether the host carries the IPv6 loopback address.
 *
 * Docker binds the host side of a `-p` mapping when the container starts, so asking it to publish
 * on `[::1]` where that address does not exist fails the container outright rather than degrading
 * to IPv4. Hosts with IPv6 disabled at the kernel level have no `::1` on their loopback interface.
 */
export const hasIpv6Loopback = (): boolean =>
  Object.values(networkInterfaces())
    .flat()
    .some((details) => details?.internal === true && details.address === '::1');
