/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Returns true when the given URL targets a loopback address.
 * Parses the URL with the built-in URL constructor and compares
 * the hostname exactly against known loopback values.
 */
export function isLoopbackUrl (url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return LOOPBACK_HOSTNAMES.has(hostname)
  } catch {
    return false
  }
}
