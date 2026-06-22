/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Config file writer + pure helpers for immutable updates to a RawConfig.
 *
 * Loading uses {@link ./schema.ts} (two-pass: structural, then deep) and
 * resolves `$(...)` expressions. Writing is the reverse: we author a YAML
 * file that may contain `$(...)` expressions pointing at the secret store,
 * validate its structure, and persist with restrictive permissions.
 *
 * All mutation helpers return new objects — never modify inputs.
 */

import { chmod, mkdir, rename, stat, writeFile, unlink } from 'node:fs/promises'
import { execSync, type ExecSyncOptionsWithStringEncoding } from 'node:child_process'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { stringify as stringifyYaml, parse as parseYaml } from 'yaml'

/**
 * Raw, pre-resolution shape of a config file. `unknown` leaf values are
 * permitted so `$(...)` expression strings sit alongside real data.
 */
export interface RawConfig {
  current_context: string
  contexts: Record<string, RawContext>
  commands?: unknown
  [key: string]: unknown
}

/** Raw, pre-resolution shape of a single context. */
export type RawContext = Record<string, unknown>

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

function execOpts (timeoutMs: number): ExecSyncOptionsWithStringEncoding {
  return { encoding: 'utf-8', timeout: timeoutMs, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Returns a new config with `contextData` stored under `name` in `contexts`.
 * Overwrite unconditional — policy (error on collision, etc.) lives in the
 * command handler.
 */
export function upsertContext (config: RawConfig, name: string, contextData: RawContext): RawConfig {
  return {
    ...config,
    contexts: { ...config.contexts, [name]: { ...contextData } },
  }
}

/**
 * Returns a new config with `name` removed from `contexts`.
 * If the removed context was `current_context`, that field is cleared (empty
 * string); callers are responsible for choosing a replacement or writing an
 * empty config.
 */
export function removeContext (config: RawConfig, name: string): RawConfig {
  if (!(name in config.contexts)) return config
  const next: Record<string, RawContext> = {}
  for (const [k, v] of Object.entries(config.contexts)) {
    if (k !== name) next[k] = v
  }
  const result: RawConfig = { ...config, contexts: next }
  if (config.current_context === name) {
    result.current_context = ''
  }
  return result
}

/**
 * Returns a new config with `current_context` set to `name`.
 * @throws when `name` is not a known context key.
 */
export function setCurrentContext (config: RawConfig, name: string): RawConfig {
  if (!(name in config.contexts)) {
    const available = Object.keys(config.contexts).join(', ')
    throw new Error(
      `Cannot set current_context to "${name}": not found. Available contexts: ${available || '(none)'}`
    )
  }
  return { ...config, current_context: name }
}

/**
 * Pulls a single context out of a config. Caller mutates the returned
 * object, then merges back via {@link upsertContext}.
 */
export function extractContext (config: RawConfig, name: string): RawContext {
  const ctx = config.contexts[name]
  if (ctx == null) {
    const available = Object.keys(config.contexts).join(', ')
    throw new Error(`Context "${name}" not found. Available contexts: ${available || '(none)'}`)
  }
  return ctx
}

/**
 * Creates an empty-but-valid skeleton config used as the starting point
 * when no config file exists yet.
 */
export function emptyConfig (): RawConfig {
  return { current_context: '', contexts: {} }
}

/**
 * Auth field names that hold secrets. Shared between the writer, the config
 * command handlers, the loader (perms warning), and the cloud credential
 * policy so new secret fields only need to be added here once.
 */
export const SECRET_AUTH_FIELDS = new Set(['password', 'api_key'])

/**
 * Returns true when any context in `config` holds a secret value inline
 * (i.e. a non-empty string that is not a `$(...)` resolver expression).
 * Walks every service block dynamically, so it stays correct as new
 * service blocks are added to the schema.
 */
export function hasInlineSecrets (config: RawConfig): boolean {
  for (const ctx of Object.values(config.contexts)) {
    if (ctx == null || typeof ctx !== 'object') continue
    for (const block of Object.values(ctx as Record<string, unknown>)) {
      if (block == null || typeof block !== 'object') continue
      const auth = (block as Record<string, unknown>).auth
      if (auth == null || typeof auth !== 'object') continue
      for (const [k, v] of Object.entries(auth)) {
        if (!SECRET_AUTH_FIELDS.has(k)) continue
        if (typeof v === 'string' && v.length > 0 && !v.includes('$(')) return true
      }
    }
  }
  return false
}

/**
 * Resolves the path to the config file the CLI will read or write.
 *
 * Precedence:
 *   1. explicit `--config-file` argument (if a non-empty string)
 *   2. `ELASTIC_CLI_CONFIG_FILE` env var (if set and non-empty)
 *   3. `~/.elasticrc.yml`
 *
 * Kept here (not in loader.ts) because write-side callers in `commands.ts`
 * and `cloud/credentials.ts` need it without importing the full loader.
 */
export function resolveConfigPath (explicit?: string): string {
  if (typeof explicit === 'string' && explicit.length > 0) return explicit
  const env = process.env.ELASTIC_CLI_CONFIG_FILE
  if (typeof env === 'string' && env.length > 0) return env
  return join(homedir(), '.elasticrc.yml')
}

// ---------------------------------------------------------------------------
// Serialization + write
// ---------------------------------------------------------------------------

export interface WriteConfigOptions {
  /** Attempt to enforce 0600 perms (Unix chmod / Windows ACL). Default: true. */
  restrictPermissions?: boolean
  /** Create parent directories if missing. Default: true. */
  createParentDirs?: boolean
}

export interface WriteConfigResult {
  path: string
  permsEnforced: boolean
  warnings: string[]
}

/**
 * Atomically writes `config` to `path` as YAML.
 *
 * Process:
 *   1. Structurally validate the incoming config (so we never write junk).
 *   2. Serialize with stable key order.
 *   3. Write to a sibling tempfile, chmod 0600 *before* rename (Unix) so the
 *      permissions window never exposes readable content.
 *   4. On Unix: stat after rename; emit a warning if perms ended up wider.
 *   5. On Windows: best-effort ACL tightening via `icacls`; warn on failure.
 */
export async function writeConfig (
  path: string,
  config: RawConfig,
  options: WriteConfigOptions = {}
): Promise<WriteConfigResult> {
  const { restrictPermissions = true, createParentDirs = true } = options

  // Callers (command handlers) own config validity; deep validation happens at
  // load time via ContextSchema after expression resolution.

  if (createParentDirs) {
    await mkdir(dirname(path), { recursive: true })
  }

  const yaml = serializeConfig(config)
  const warnings: string[] = []

  const tmp = join(dirname(path), `.${basename(path)}.${randomBytes(4).toString('hex')}.tmp`)
  let permsEnforced = false

  try {
    await writeFile(tmp, yaml, { encoding: 'utf-8', mode: 0o600 })
    if (restrictPermissions && _platform !== 'win32') {
      await chmod(tmp, 0o600)
    }
    await rename(tmp, path)

    if (restrictPermissions) {
      if (_platform === 'win32') {
        try {
          _execSync(
            `icacls "${path}" /inheritance:r /grant:r "%USERNAME%":F`,
            execOpts(5_000)
          )
          permsEnforced = true
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          warnings.push(`Could not restrict permissions on "${path}" via icacls: ${msg}`)
        }
      } else {
        await chmod(path, 0o600)
        const st = await stat(path)
        const mode = st.mode & 0o777
        if (mode === 0o600) {
          permsEnforced = true
        } else {
          warnings.push(
            `Config file "${path}" has permissions ${mode.toString(8).padStart(3, '0')} (expected 0600). ` +
            'The filesystem may not support Unix permissions.'
          )
        }
      }
    }
  } catch (err) {
    try { await unlink(tmp) } catch { /* ignore */ }
    throw err
  }

  return { path, permsEnforced, warnings }
}

function basename (p: string): string {
  const i = p.lastIndexOf('/')
  const j = p.lastIndexOf('\\')
  const k = Math.max(i, j)
  return k === -1 ? p : p.slice(k + 1)
}

/**
 * YAML serializer. Keeps a stable top-level key order
 * (`current_context`, `contexts`, `commands`) so round-trips produce diffs
 * limited to the fields that actually changed.
 */
export function serializeConfig (config: RawConfig): string {
  const ordered: Record<string, unknown> = {}
  ordered.current_context = config.current_context
  ordered.contexts = config.contexts
  if (config.commands != null) ordered.commands = config.commands
  if (config.banner != null) ordered.banner = config.banner
  for (const [k, v] of Object.entries(config)) {
    if (k === 'current_context' || k === 'contexts' || k === 'commands' || k === 'banner') continue
    ordered[k] = v
  }
  return stringifyYaml(ordered, { lineWidth: 0 })
}

/**
 * Reads a config file from disk and returns the raw (pre-resolution) shape.
 * Use this before calling the `upsert/remove/setCurrent/extract` helpers.
 *
 * Returns {@link emptyConfig} if the file does not exist, so callers can
 * treat "no config yet" as a first-use path rather than an error.
 */
export async function readRawConfig (path: string): Promise<RawConfig> {
  const { readFile } = await import('node:fs/promises')
  let content: string
  try {
    content = await readFile(path, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return emptyConfig()
    throw err
  }
  const parsed = parseYaml(content) as unknown
  if (parsed == null || typeof parsed !== 'object') return emptyConfig()
  // Coerce to RawConfig shape; downstream validation happens at load time.
  const obj = parsed as Partial<RawConfig>
  return {
    current_context: typeof obj.current_context === 'string' ? obj.current_context : '',
    contexts: (obj.contexts != null && typeof obj.contexts === 'object')
      ? obj.contexts as Record<string, RawContext>
      : {},
    ...(obj.commands != null ? { commands: obj.commands } : {}),
    ...(typeof obj.banner === 'boolean' ? { banner: obj.banner } : {}),
  }
}
