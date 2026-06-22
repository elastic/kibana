/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * OS-level secret storage abstraction.
 *
 * Mirrors the read-side resolvers in {@link ./resolvers.ts} but for writes.
 * Implementations shell out to platform-native tools:
 *   - macOS:   `security` (Keychain Access)
 *   - Linux:   `secret-tool` (libsecret)
 *   - pass:    `pass` (the standard unix password manager)
 *   - Windows: PowerShell CredentialManager module
 *
 * Each implementation exposes `put` / `delete` / `isAvailable` and produces a
 * resolver-expression string that, when placed in the YAML config, will be
 * read back by the corresponding resolver.
 */

import { execSync, type ExecSyncOptionsWithStringEncoding } from 'node:child_process'

/** Distinguishes between the supported secret-store implementations. */
export type SecretStoreKind =
  | 'keychain'
  | 'secret_service'
  | 'pass'
  | 'credential_manager'
  | 'none'

/**
 * Writeable secret store. Read is delegated to the matching resolver in
 * `resolvers.ts`; `resolverExpr` produces the `$(...)` string to place in YAML.
 */
export interface SecretStore {
  kind: SecretStoreKind
  /** Cheap probe for the backing tool's presence. Cached per-instance. */
  isAvailable(): Promise<boolean>
  /**
   * Stores `secret` under `(service, account)`. Overwrites silently on
   * existing entries (policy lives one layer up in the command handlers).
   */
  put(service: string, account: string, secret: string): Promise<void>
  /**
   * Removes the entry. Idempotent: absent entries succeed.
   */
  delete(service: string, account: string): Promise<void>
  /** YAML expression string (e.g. `$(keychain:elastic-cli/prod:es.api_key)`). */
  resolverExpr(service: string, account: string): string
}

const PRINTABLE_ASCII_RE = /^[\x20-\x7e]+$/

function validateServiceAccount (service: string, account: string, kind: SecretStoreKind): void {
  for (const [field, value] of [['service', service], ['account', account]] as const) {
    if (value.length === 0) {
      throw new Error(`Invalid ${kind} ${field}: must not be empty`)
    }
    if (!PRINTABLE_ASCII_RE.test(value)) {
      throw new Error(
        `Invalid ${kind} ${field} "${value}": contains non-printable characters`
      )
    }
    if (value.includes('/')) {
      throw new Error(
        `Invalid ${kind} ${field} "${value}": must not contain "/"`
      )
    }
  }
}

function execOpts (timeoutMs: number, input?: string): ExecSyncOptionsWithStringEncoding & { input?: string } {
  const opts: ExecSyncOptionsWithStringEncoding & { input?: string } = {
    encoding: 'utf-8',
    timeout: timeoutMs,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  }
  if (input !== undefined) opts.input = input
  return opts
}

function shellEscape (value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'"
}

function psEncodedCommand (expression: string): string {
  const utf16le = Buffer.from(expression, 'utf16le')
  return `powershell -NoProfile -NonInteractive -EncodedCommand ${utf16le.toString('base64')}`
}

// ---------------------------------------------------------------------------
// Test seams
// ---------------------------------------------------------------------------

let _execSync: typeof execSync = execSync
let _platform: string = process.platform

/** @internal */
export function _testSetExecSync (fn: typeof execSync): () => void {
  const prev = _execSync
  _execSync = fn
  return () => { _execSync = prev }
}

/** @internal */
export function _testSetPlatform (p: string): () => void {
  const prev = _platform
  _platform = p
  return () => { _platform = prev }
}

// ---------------------------------------------------------------------------
// Implementations
// ---------------------------------------------------------------------------

abstract class ShellSecretStore implements SecretStore {
  abstract kind: SecretStoreKind
  private availability: boolean | undefined

  async isAvailable (): Promise<boolean> {
    if (this.availability !== undefined) return this.availability
    try {
      this.probe()
      this.availability = true
    } catch {
      this.availability = false
    }
    return this.availability
  }

  protected abstract probe(): void
  abstract put(service: string, account: string, secret: string): Promise<void>
  abstract delete(service: string, account: string): Promise<void>
  abstract resolverExpr(service: string, account: string): string
}

class MacOSKeychainStore extends ShellSecretStore {
  kind = 'keychain' as const

  protected probe (): void {
    _execSync('security -h', execOpts(2_000))
  }

  async put (service: string, account: string, secret: string): Promise<void> {
    validateServiceAccount(service, account, this.kind)
    try {
      // -U updates an existing entry in-place instead of failing.
      // Use -w with the value as an argument; `security` supports reading from
      // stdin via `-w` with no value, but argv is simpler and the value is
      // ASCII-safe after validation.
      _execSync(
        `security add-generic-password -U -s ${shellEscape(service)} -a ${shellEscape(account)} -w ${shellEscape(secret)}`,
        execOpts(5_000)
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Keychain write failed for service="${service}", account="${account}": ${message}`, { cause: err })
    }
  }

  async delete (service: string, account: string): Promise<void> {
    validateServiceAccount(service, account, this.kind)
    try {
      _execSync(
        `security delete-generic-password -s ${shellEscape(service)} -a ${shellEscape(account)}`,
        execOpts(5_000)
      )
    } catch {
      // Idempotent: absent entries exit non-zero but are not an error.
    }
  }

  resolverExpr (service: string, account: string): string {
    validateServiceAccount(service, account, this.kind)
    return `$(keychain:${service}/${account})`
  }
}

class LinuxSecretServiceStore extends ShellSecretStore {
  kind = 'secret_service' as const

  protected probe (): void {
    _execSync('secret-tool --version', execOpts(2_000))
  }

  async put (service: string, account: string, secret: string): Promise<void> {
    validateServiceAccount(service, account, this.kind)
    try {
      _execSync(
        `secret-tool store --label=${shellEscape(`elastic-cli:${service}:${account}`)} service ${shellEscape(service)} account ${shellEscape(account)}`,
        execOpts(5_000, secret)
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Secret Service write failed for service="${service}", account="${account}": ${message}`, { cause: err })
    }
  }

  async delete (service: string, account: string): Promise<void> {
    validateServiceAccount(service, account, this.kind)
    try {
      _execSync(
        `secret-tool clear service ${shellEscape(service)} account ${shellEscape(account)}`,
        execOpts(5_000)
      )
    } catch {
      // Idempotent.
    }
  }

  resolverExpr (service: string, account: string): string {
    validateServiceAccount(service, account, this.kind)
    return `$(secret_service:${service}/${account})`
  }
}

class PassStore extends ShellSecretStore {
  kind = 'pass' as const

  protected probe (): void {
    _execSync('pass version', execOpts(2_000))
  }

  private passPath (service: string, account: string): string {
    return `${service}/${account}`
  }

  async put (service: string, account: string, secret: string): Promise<void> {
    validateServiceAccount(service, account, this.kind)
    const path = this.passPath(service, account)
    try {
      // `pass insert -m -f <path>` reads a multi-line password from stdin and
      // overwrites any existing entry without prompting.
      _execSync(`pass insert -m -f ${shellEscape(path)}`, execOpts(5_000, secret + '\n'))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`pass write failed for "${path}": ${message}`, { cause: err })
    }
  }

  async delete (service: string, account: string): Promise<void> {
    validateServiceAccount(service, account, this.kind)
    const path = this.passPath(service, account)
    try {
      _execSync(`pass rm -f ${shellEscape(path)}`, execOpts(5_000))
    } catch {
      // Idempotent.
    }
  }

  resolverExpr (service: string, account: string): string {
    validateServiceAccount(service, account, this.kind)
    return `$(pass:${this.passPath(service, account)})`
  }
}

class WindowsCredentialManagerStore extends ShellSecretStore {
  kind = 'credential_manager' as const

  protected probe (): void {
    // CredentialManager is a community PowerShell module. Probe for
    // `Get-Command New-StoredCredential` — cheaper than loading the module.
    _execSync(
      psEncodedCommand('if (-not (Get-Command New-StoredCredential -ErrorAction SilentlyContinue)) { exit 1 }'),
      execOpts(5_000)
    )
  }

  private target (service: string, account: string): string {
    return `${service}/${account}`
  }

  async put (service: string, account: string, secret: string): Promise<void> {
    validateServiceAccount(service, account, this.kind)
    const target = this.target(service, account).replace(/'/g, "''")
    const user = account.replace(/'/g, "''")
    const pass = secret.replace(/'/g, "''")
    const expression =
      `$secure = ConvertTo-SecureString -String '${pass}' -AsPlainText -Force; ` +
      `New-StoredCredential -Target '${target}' -UserName '${user}' -SecurePassword $secure -Persist LocalMachine | Out-Null`
    try {
      _execSync(psEncodedCommand(expression), execOpts(10_000))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Credential Manager write failed for service="${service}", account="${account}": ${message}`, { cause: err })
    }
  }

  async delete (service: string, account: string): Promise<void> {
    validateServiceAccount(service, account, this.kind)
    const target = this.target(service, account).replace(/'/g, "''")
    try {
      _execSync(
        psEncodedCommand(`Remove-StoredCredential -Target '${target}' -ErrorAction SilentlyContinue`),
        execOpts(10_000)
      )
    } catch {
      // Idempotent.
    }
  }

  resolverExpr (service: string, account: string): string {
    validateServiceAccount(service, account, this.kind)
    return `$(credential_manager:${this.target(service, account)})`
  }
}

class NoopStore implements SecretStore {
  kind = 'none' as const
  async isAvailable (): Promise<boolean> { return false }
  async put (): Promise<void> {
    throw new Error('No OS secret store is available on this system. Re-run with --inline-secrets to write credentials to the config file (they will be stored in plain text).')
  }
  async delete (): Promise<void> { /* nothing to delete */ }
  resolverExpr (): string {
    throw new Error('No OS secret store is available: cannot produce a resolver expression')
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Returns the first available secret store for the current platform.
 *
 * Probe order:
 *   - darwin: Keychain
 *   - linux:  secret-tool → pass
 *   - win32:  CredentialManager
 *   - other:  pass (best effort)
 *
 * Falls back to a {@link NoopStore} if none are available.
 */
export async function getSecretStore (): Promise<SecretStore> {
  const candidates = candidatesForPlatform(_platform)
  for (const store of candidates) {
    if (await store.isAvailable()) return store
  }
  return new NoopStore()
}

function candidatesForPlatform (platform: string): SecretStore[] {
  switch (platform) {
    case 'darwin':
      return [new MacOSKeychainStore()]
    case 'linux':
      return [new LinuxSecretServiceStore(), new PassStore()]
    case 'win32':
      return [new WindowsCredentialManagerStore()]
    default:
      return [new PassStore()]
  }
}

// ---------------------------------------------------------------------------
// Exports for tests
// ---------------------------------------------------------------------------

export const _testStores = {
  MacOSKeychainStore,
  LinuxSecretServiceStore,
  PassStore,
  WindowsCredentialManagerStore,
  NoopStore,
}
