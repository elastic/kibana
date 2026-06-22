/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * `elastic config ...` command tree.
 *
 * Unlike the cloud/stack commands, these do not require a resolved config; they
 * *author* it. The CLI entrypoint skips the config-loading preAction hook for
 * any command whose ancestor group is "config" (see {@link ../cli.ts}).
 *
 * Secrets are stored in the OS keychain (via {@link SecretStore}) when one is
 * available. The YAML then contains `$(keychain:...)` resolver expressions
 * rather than the raw secret. If no keychain is available, or the user passes
 * `--inline-secrets`, the secret is written inline and the file is chmod'd to
 * 0600 with a warning surfaced to the user.
 */

import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { defineCommand, defineGroup } from '../factory'
import type { JsonValue, OpaqueCommandHandle } from '../factory'
import {
  readRawConfig,
  writeConfig,
  upsertContext,
  removeContext,
  setCurrentContext,
  extractContext,
  hasInlineSecrets,
  resolveConfigPath,
  type RawContext,
} from './writer'
import { getSecretStore, type SecretStore } from './secret-store'
import { ContextSchema } from './schema'

const KEYCHAIN_SERVICE = 'elastic-cli'

/** Secret flags supported on `context add` / `context edit --set`. */
interface SecretField {
  /** CLI flag name (no leading --) */
  flag: string
  /** Dotted path in the context where the secret lives (e.g. `elasticsearch.auth.api_key`) */
  path: string[]
  description: string
}

/** Non-secret URL / username flags. */
interface PlainField {
  flag: string
  path: string[]
  description: string
}

const SECRET_FIELDS: SecretField[] = [
  { flag: 'es-api-key',      path: ['elasticsearch', 'auth', 'api_key'],  description: 'Elasticsearch API key' },
  { flag: 'es-password',     path: ['elasticsearch', 'auth', 'password'], description: 'Elasticsearch password' },
  { flag: 'kb-api-key',      path: ['kibana', 'auth', 'api_key'],         description: 'Kibana API key' },
  { flag: 'kb-password',     path: ['kibana', 'auth', 'password'],        description: 'Kibana password' },
  { flag: 'cloud-api-key',   path: ['cloud', 'auth', 'api_key'],          description: 'Elastic Cloud API key' },
]

const PLAIN_FIELDS: PlainField[] = [
  { flag: 'es-url',       path: ['elasticsearch', 'url'],           description: 'Elasticsearch URL' },
  { flag: 'es-username',  path: ['elasticsearch', 'auth', 'username'], description: 'Elasticsearch username (pair with --es-password)' },
  { flag: 'kb-url',       path: ['kibana', 'url'],                  description: 'Kibana URL' },
  { flag: 'kb-username',  path: ['kibana', 'auth', 'username'],     description: 'Kibana username (pair with --kb-password)' },
  { flag: 'cloud-url',    path: ['cloud', 'url'],                   description: 'Elastic Cloud API URL' },
]

/**
 * Pulls the `--config-file` flag out of the command's parsed options and
 * feeds it to the shared {@link resolveConfigPath}.
 */
function configPathFromOptions (options: Record<string, string | number | boolean>): string {
  const flag = options['config-file']
  return resolveConfigPath(typeof flag === 'string' ? flag : undefined)
}

/** Sets a dotted path on an object immutably, creating intermediate objects as needed. */
function setPath (obj: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  if (path.length === 0) return obj
  const [head, ...rest] = path
  const headKey = head!
  if (rest.length === 0) {
    return { ...obj, [headKey]: value }
  }
  const child = obj[headKey]
  const next = (child != null && typeof child === 'object' && !Array.isArray(child))
    ? child as Record<string, unknown>
    : {}
  return { ...obj, [headKey]: setPath(next, rest, value) }
}

interface FieldUpdate {
  secrets: Array<{ field: SecretField; value: string }>
  plains: Array<{ field: PlainField; value: string }>
}

/**
 * Reads all secret/plain flags from `options` (skipping undefined ones) and
 * returns them partitioned. Values passed as `""` are treated as unset.
 */
function collectFieldUpdates (options: Record<string, string | number | boolean>): FieldUpdate {
  const secrets: FieldUpdate['secrets'] = []
  const plains: FieldUpdate['plains'] = []
  for (const field of SECRET_FIELDS) {
    const raw = options[field.flag]
    if (typeof raw === 'string' && raw.length > 0) {
      secrets.push({ field, value: raw })
    }
  }
  for (const field of PLAIN_FIELDS) {
    const raw = options[field.flag]
    if (typeof raw === 'string' && raw.length > 0) {
      plains.push({ field, value: raw })
    }
  }
  return { secrets, plains }
}

/**
 * Applies `FieldUpdate` on top of `baseContext`, storing secrets via the
 * provided {@link SecretStore} (or inline when unavailable / `inlineSecrets`).
 * Returns the new context plus a log of what happened with each secret.
 */
interface ApplyFieldUpdatesResult {
  context: RawContext
  secretsLog: Array<{ path: string; storage: 'keychain' | 'secret_service' | 'pass' | 'credential_manager' | 'inline' }>
  warnings: string[]
}

async function applyFieldUpdates (
  baseContext: RawContext,
  updates: FieldUpdate,
  contextName: string,
  store: SecretStore | null,
  inlineSecrets: boolean
): Promise<ApplyFieldUpdatesResult> {
  let ctx = baseContext as Record<string, unknown>
  const secretsLog: ApplyFieldUpdatesResult['secretsLog'] = []
  const warnings: string[] = []

  for (const { field, value } of updates.plains) {
    ctx = setPath(ctx, field.path, value)
  }

  // When inlineSecrets is true we never use the store, so skip the probe entirely.
  const storeAvailable = store != null && !inlineSecrets && await store.isAvailable()
  if (updates.secrets.length > 0 && !storeAvailable && !inlineSecrets) {
    warnings.push(
      'No OS secret store is available; secrets will be written inline to the config file. ' +
      'The file will be chmod 0600 on Unix. Pass --inline-secrets to suppress this warning.'
    )
  }

  const useStore = storeAvailable && store != null
  for (const { field, value } of updates.secrets) {
    const account = `${contextName}:${field.path.join('.')}`
    if (useStore && store != null) {
      await store.put(KEYCHAIN_SERVICE, account, value)
      const expr = store.resolverExpr(KEYCHAIN_SERVICE, account)
      ctx = setPath(ctx, field.path, expr)
      secretsLog.push({ path: field.path.join('.'), storage: store.kind as Exclude<SecretStore['kind'], 'none'> })
    } else {
      ctx = setPath(ctx, field.path, value)
      secretsLog.push({ path: field.path.join('.'), storage: 'inline' })
    }
  }

  return { context: ctx as RawContext, secretsLog, warnings }
}

function getPath (obj: Record<string, unknown>, path: string[]): unknown {
  let cur: unknown = obj
  for (const key of path) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

/**
 * Deletes all keychain entries associated with `contextName`. Best-effort:
 * failures are swallowed so a `context remove` never fails because a specific
 * keychain entry was already deleted.
 */
async function purgeContextSecrets (contextName: string, ctx: RawContext | undefined): Promise<void> {
  if (ctx == null) return
  // Identify fields that have resolver expressions — these are the only ones
  // stored in the OS keychain. Inline secrets have nothing to purge.
  const keychainFields = SECRET_FIELDS.filter(field => {
    const val = getPath(ctx as Record<string, unknown>, field.path)
    return typeof val === 'string' && val.includes('$(')
  })
  if (keychainFields.length === 0) return
  // Only probe the secret store when there is actually something to delete.
  const store = await getSecretStore()
  for (const field of keychainFields) {
    const account = `${contextName}:${field.path.join('.')}`
    try {
      await store.delete(KEYCHAIN_SERVICE, account)
    } catch {
      // swallow
    }
  }
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

/** Output shape common to add/edit/remove: summary of what happened. */
interface CommandSummary {
  configFile: string
  context: string
  action: 'added' | 'updated' | 'removed'
  current: string
  secrets: Array<{ path: string; storage: string }>
  warnings: string[]
}

async function handleContextList (options: Record<string, string | number | boolean>): Promise<JsonValue> {
  const path = configPathFromOptions(options)
  const config = await readRawConfig(path)
  const names = Object.keys(config.contexts)
  return {
    configFile: path,
    current: config.current_context,
    contexts: names.map(name => ({ name, current: name === config.current_context })),
  }
}

async function handleContextAdd (parsed: {
  options: Record<string, string | number | boolean>
  arg?: string
}): Promise<JsonValue> {
  const { options, arg } = parsed
  const name = requireName(arg, 'context name')
  const path = configPathFromOptions(options)
  const force = options.force === true
  const inlineSecrets = options['inline-secrets'] === true

  const config = await readRawConfig(path)
  if (name in config.contexts && !force) {
    return errorResult('context_exists', `context "${name}" already exists. Pass --force to overwrite.`)
  }

  const updates = collectFieldUpdates(options)
  if (updates.plains.length === 0 && updates.secrets.length === 0) {
    return errorResult(
      'no_fields',
      'No context fields provided. Pass at least one of --es-url / --kb-url / --cloud-url (and auth flags).'
    )
  }

  const store = inlineSecrets ? null : await getSecretStore()
  const { context: ctx, secretsLog, warnings } = await applyFieldUpdates({}, updates, name, store, inlineSecrets)

  const contextValidation = ContextSchema.safeParse(resolveForValidation(ctx))
  if (!contextValidation.success) {
    return errorResult('invalid_context', `context validation failed: ${contextValidation.error.issues.map(i => i.message).join('; ')}`)
  }

  let next = upsertContext(config, name, ctx)
  if (next.current_context === '') next = setCurrentContext(next, name)

  const result = await writeConfig(path, next, { restrictPermissions: hasInlineSecrets(next) })
  const summary: CommandSummary = {
    configFile: result.path,
    context: name,
    action: (name in config.contexts) ? 'updated' : 'added',
    current: next.current_context,
    secrets: secretsLog,
    warnings: [...warnings, ...result.warnings],
  }
  return summary as unknown as JsonValue
}

async function handleContextRemove (parsed: {
  options: Record<string, string | number | boolean>
  arg?: string
}): Promise<JsonValue> {
  const { options, arg } = parsed
  const name = requireName(arg, 'context name')
  const path = configPathFromOptions(options)
  const force = options.force === true

  const config = await readRawConfig(path)
  if (!(name in config.contexts)) {
    return errorResult('context_not_found', `context "${name}" not found`)
  }
  if (config.current_context === name && !force) {
    return errorResult(
      'current_context',
      `context "${name}" is the current context. Pass --force to remove it anyway.`
    )
  }

  await purgeContextSecrets(name, config.contexts[name])

  const next = removeContext(config, name)
  if (Object.keys(next.contexts).length === 0) {
    try { await unlink(path) } catch { /* ignore */ }
    return {
      configFile: path,
      context: name,
      action: 'removed',
      current: '',
      removed_config_file: true,
    } as JsonValue
  }

  const result = await writeConfig(path, next, { restrictPermissions: hasInlineSecrets(next) })
  return {
    configFile: result.path,
    context: name,
    action: 'removed',
    current: next.current_context,
    warnings: result.warnings,
  } as JsonValue
}

async function handleContextEdit (parsed: {
  options: Record<string, string | number | boolean>
  arg?: string
}): Promise<JsonValue> {
  const { options, arg } = parsed
  const name = requireName(arg, 'context name')
  const path = configPathFromOptions(options)
  const inlineSecrets = options['inline-secrets'] === true

  const config = await readRawConfig(path)
  if (!(name in config.contexts)) {
    return errorResult('context_not_found', `context "${name}" not found`)
  }

  const updates = collectFieldUpdates(options)
  const hasFlagEdits = updates.plains.length > 0 || updates.secrets.length > 0

  if (hasFlagEdits) {
    // Flag-patch mode
    const store = inlineSecrets ? null : await getSecretStore()
    const { context: ctx, secretsLog, warnings } = await applyFieldUpdates(
      extractContext(config, name),
      updates,
      name,
      store,
      inlineSecrets,
    )
    const validation = ContextSchema.safeParse(resolveForValidation(ctx))
    if (!validation.success) {
      return errorResult('invalid_context', `context validation failed: ${validation.error.issues.map(i => i.message).join('; ')}`)
    }
    const next = upsertContext(config, name, ctx)
    const result = await writeConfig(path, next, { restrictPermissions: hasInlineSecrets(next) })
    return {
      configFile: result.path,
      context: name,
      action: 'updated',
      current: next.current_context,
      secrets: secretsLog,
      warnings: [...warnings, ...result.warnings],
    } as unknown as JsonValue
  }

  // $EDITOR mode
  const original = extractContext(config, name)
  const edited = await editInEditor(name, original)
  if (edited == null) {
    return errorResult('edit_cancelled', 'editor exited non-zero or produced empty content; config unchanged')
  }
  const validation = ContextSchema.safeParse(resolveForValidation(edited))
  if (!validation.success) {
    return errorResult('invalid_context', `edited context failed validation: ${validation.error.issues.map(i => i.message).join('; ')}`)
  }
  const next = upsertContext(config, name, edited)
  const result = await writeConfig(path, next, { restrictPermissions: hasInlineSecrets(next) })
  return {
    configFile: result.path,
    context: name,
    action: 'updated',
    current: next.current_context,
    warnings: result.warnings,
  } as JsonValue
}

async function handleCurrentContextGet (options: Record<string, string | number | boolean>): Promise<JsonValue> {
  const path = configPathFromOptions(options)
  const config = await readRawConfig(path)
  if (!config.current_context) {
    return errorResult('no_current_context', 'no current_context is set')
  }
  return { current: config.current_context } as JsonValue
}

async function handleCurrentContextSet (parsed: {
  options: Record<string, string | number | boolean>
  arg?: string
}): Promise<JsonValue> {
  const { options, arg } = parsed
  const name = requireName(arg, 'context name')
  const path = configPathFromOptions(options)
  const config = await readRawConfig(path)
  if (!(name in config.contexts)) {
    const available = Object.keys(config.contexts).join(', ') || '(none)'
    return errorResult('context_not_found', `context "${name}" not found. Available: ${available}`)
  }
  const next = setCurrentContext(config, name)
  const result = await writeConfig(path, next, { restrictPermissions: hasInlineSecrets(next) })
  return {
    configFile: result.path,
    current: name,
    warnings: result.warnings,
  } as JsonValue
}

// ---------------------------------------------------------------------------
// Helpers used by handlers
// ---------------------------------------------------------------------------

function requireName (arg: string | undefined, label: string): string {
  if (arg == null || arg.trim().length === 0) {
    throw new Error(`${label} is required`)
  }
  return arg
}

/** Returns a factory error envelope (see `formatHandlerError` in output.ts). */
function errorResult (code: string, message: string): JsonValue {
  return { error: { code, message } }
}

/**
 * Replaces `$(...)` resolver expressions in a context with a placeholder,
 * so `ContextSchema` can validate the *shape* without actually resolving
 * secrets. The placeholder is a valid non-empty string.
 */
function resolveForValidation (ctx: RawContext): unknown {
  return walk(ctx) as unknown
  function walk (v: unknown): unknown {
    if (typeof v === 'string') return v.includes('$(') ? 'placeholder' : v
    if (Array.isArray(v)) return v.map(walk)
    if (v != null && typeof v === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v)) out[k] = walk(val)
      return out
    }
    return v
  }
}

/**
 * Opens $EDITOR on a single-context YAML fragment. On clean exit, returns
 * the parsed context; on cancel / empty / error, returns null.
 */
async function editInEditor (name: string, original: RawContext): Promise<RawContext | null> {
  const editor = process.env.EDITOR ?? process.env.VISUAL ?? (process.platform === 'win32' ? 'notepad' : 'vi')
  const header =
    `# Editing context "${name}" -- save and exit to apply, or exit with an error to cancel.\n` +
    `# Any $(...) expressions are preserved as-is.\n` +
    '# This file will be deleted after editing.\n'
  const body = stringifyYaml(original, { lineWidth: 0 })

  const dir = await mkdtemp(join(tmpdir(), 'elastic-cli-edit-'))
  const path = join(dir, `${name}.yml`)
  try {
    await writeFile(path, header + body, { encoding: 'utf-8', mode: 0o600 })
    const exitCode = await new Promise<number>((resolve, reject) => {
      const child = spawn(editor, [path], { stdio: 'inherit', shell: true })
      child.on('exit', code => resolve(code ?? 0))
      child.on('error', reject)
    })
    if (exitCode !== 0) return null
    const content = await readFile(path, 'utf-8')
    const trimmed = content.replace(/^\s*#[^\n]*\n?/gm, '').trim()
    if (trimmed.length === 0) return null
    const parsed = parseYaml(content) as unknown
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as RawContext
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

// ---------------------------------------------------------------------------
// Command tree
// ---------------------------------------------------------------------------

const CONFIG_FILE_OPT = {
  long: 'config-file',
  type: 'string' as const,
  description: 'path to the config file to edit (defaults to ~/.elasticrc.yml)',
}

function fieldOptions (): Array<{ long: string; type: 'string'; description: string }> {
  return [
    ...PLAIN_FIELDS.map(f => ({ long: f.flag, type: 'string' as const, description: f.description })),
    ...SECRET_FIELDS.map(f => ({ long: f.flag, type: 'string' as const, description: `${f.description} (secret -- stored in the OS keychain when available)` })),
  ]
}

function buildContextGroup (): OpaqueCommandHandle {
  const addCmd = defineCommand({
    name: 'add',
    description: 'Add a new context to the config file',
    positionalArg: { name: 'name', description: 'context name', required: true },
    options: [
      CONFIG_FILE_OPT,
      { long: 'force', type: 'boolean', description: 'overwrite an existing context with the same name' },
      { long: 'inline-secrets', type: 'boolean', description: 'store secrets inline in the config file (instead of the OS keychain)' },
      ...fieldOptions(),
    ],
    handler: async (parsed) => handleContextAdd(parsed),
  })

  const removeCmd = defineCommand({
    name: 'remove',
    description: 'Remove a context from the config file',
    positionalArg: { name: 'name', description: 'context name', required: true },
    options: [
      CONFIG_FILE_OPT,
      { long: 'force', type: 'boolean', description: 'allow removing the current context' },
    ],
    handler: async (parsed) => handleContextRemove(parsed),
  })

  const editCmd = defineCommand({
    name: 'edit',
    description: 'Edit an existing context (flag-patch or $EDITOR mode)',
    positionalArg: { name: 'name', description: 'context name', required: true },
    options: [
      CONFIG_FILE_OPT,
      { long: 'inline-secrets', type: 'boolean', description: 'store secrets inline in the config file (instead of the OS keychain)' },
      ...fieldOptions(),
    ],
    handler: async (parsed) => handleContextEdit(parsed),
  })

  const listCmd = defineCommand({
    name: 'list',
    description: 'List all contexts defined in the config file',
    options: [CONFIG_FILE_OPT],
    handler: async (parsed) => handleContextList(parsed.options),
  })

  return defineGroup({ name: 'context', description: 'Manage contexts in the elastic config file' }, listCmd, addCmd, editCmd, removeCmd)
}

function buildCurrentContextGroup (): OpaqueCommandHandle {
  const setCmd = defineCommand({
    name: 'set',
    description: 'Change the current context',
    positionalArg: { name: 'name', description: 'context name', required: true },
    options: [CONFIG_FILE_OPT],
    handler: async (parsed) => handleCurrentContextSet(parsed),
  })

  const getCmd = defineCommand({
    name: 'get',
    description: 'Print the current context name',
    options: [CONFIG_FILE_OPT],
    handler: async (parsed) => handleCurrentContextGet(parsed.options),
  })

  return defineGroup(
    { name: 'current-context', description: 'View or change the current context' },
    getCmd,
    setCmd,
  )
}

/**
 * Builds the top-level `config` command group.
 */
export function registerConfigCommands (): OpaqueCommandHandle {
  return defineGroup(
    { name: 'config', description: 'Author and maintain the elastic config file' },
    buildContextGroup(),
    buildCurrentContextGroup(),
  )
}

