/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import os from 'node:os'

const cliVersion: string = (require('../../package.json') as { version: string }).version
const transportVersion: string = (require('@elastic/transport/package.json') as { version: string }).version
const undiciVersion: string = (require('undici/package.json') as { version: string }).version

/**
 * Converts a semver string to the format required by the x-elastic-client-meta spec.
 * Pre-release labels (alpha, beta, rc, etc.) are replaced with a `p` suffix.
 */
export function toMetaVersion(version: string): string {
  return version.replace(/-.*$/, 'p')
}

/**
 * Returns HTTP headers that uniquely identify CLI traffic.
 *
 * - `user-agent` — human-readable identifier: CLI name/version, OS, and Node.js version
 * - `x-elastic-client-meta` — structured key=value pairs per the Elastic client-meta spec:
 *   service key (`et`), language key (`js`), transport key (`t`), HTTP client key (`un`)
 *
 * These override the generic defaults set by `@elastic/transport`.
 */
export function clientHeaders(): { 'user-agent': string; 'x-elastic-client-meta': string } {
  const userAgent = `elastic-cli/${cliVersion} (${os.platform()} ${os.arch()}; Node.js ${process.version})`
  const metaVersion = toMetaVersion(cliVersion)
  const clientMeta = `et=${metaVersion},js=${process.versions.node},t=${transportVersion},un=${undiciVersion}`
  return { 'user-agent': userAgent, 'x-elastic-client-meta': clientMeta }
}
