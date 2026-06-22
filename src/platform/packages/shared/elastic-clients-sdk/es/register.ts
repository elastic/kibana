/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Command } from 'commander'
import { z } from '@kbn/zod/v4'
import { defineCommand, defineGroup } from '../factory'
import type { OpaqueCommandHandle } from '../factory'
import type { EsApiDefinition } from './types'
import { validateApiDefinition, resolveInput } from './types'
import type { SchemaArgDefinition } from '../lib/schema-args'
import { apiManifest, loadEsApi } from './apis'
import type { EsApiMeta } from './api-manifest'
import { createEsHandler } from './handler'
import { registerHelperCommands } from './helpers/register'

/**
 * Maps root-level (no-namespace) command names to the help section they belong to.
 * Commands not listed here fall into the catch-all "Other commands" group.
 * Order within each group reflects usage frequency — most-common first.
 */
const ROOT_COMMAND_GROUPS: Record<string, string> = {
  // Documents
  get: 'Documents',
  index: 'Documents',
  create: 'Documents',
  update: 'Documents',
  delete: 'Documents',
  bulk: 'Documents',
  mget: 'Documents',
  exists: 'Documents',
  'exists-source': 'Documents',
  'get-source': 'Documents',
  'delete-by-query': 'Documents',
  'update-by-query': 'Documents',
  reindex: 'Documents',
  // Search
  search: 'Search',
  msearch: 'Search',
  'search-template': 'Search',
  'msearch-template': 'Search',
  scroll: 'Search',
  'clear-scroll': 'Search',
  'open-point-in-time': 'Search',
  'close-point-in-time': 'Search',
  'search-mvt': 'Search',
  'search-shards': 'Search',
  'render-search-template': 'Search',
  // Analysis
  count: 'Analysis',
  explain: 'Analysis',
  'field-caps': 'Analysis',
  termvectors: 'Analysis',
  mtermvectors: 'Analysis',
  'rank-eval': 'Analysis',
  'terms-enum': 'Analysis',
  // Scripts
  'get-script': 'Scripts',
  'put-script': 'Scripts',
  'delete-script': 'Scripts',
  'scripts-painless-execute': 'Scripts',
  'get-script-context': 'Scripts',
  'get-script-languages': 'Scripts',
  // Cluster
  ping: 'Cluster',
  info: 'Cluster',
  'health-report': 'Cluster',
  // Throttle / admin — shown but deprioritised
  'delete-by-query-rethrottle': 'Advanced',
  'update-by-query-rethrottle': 'Advanced',
  'reindex-rethrottle': 'Advanced',
}

/** Group label applied to every namespace sub-tree (cat, cluster, indices, …). */
const NAMESPACE_GROUP = 'API namespaces'

/**
 * Controls the display order of root-level sections in help output.
 * Lower numbers appear first. Sections not listed here sort after all listed ones.
 */
const GROUP_PRIORITY: Record<string, number> = {
  Documents: 0,
  Search: 1,
  Analysis: 2,
  Scripts: 3,
  Cluster: 4,
  Advanced: 5,
  'Other commands': 6,
}

/** Applies a help-section heading to a command handle (no-op if already set). */
function applyHelpGroup (handle: OpaqueCommandHandle, group: string): OpaqueCommandHandle {
  handle.helpGroup(group)
  return handle
}

/** Builds a leaf command handle from an eagerly-available definition and its pre-computed schema args. */
function buildLeafHandle (
  def: EsApiDefinition,
  defSchemaArgs: Map<EsApiDefinition, SchemaArgDefinition[]>
): OpaqueCommandHandle {
  const schema = def.input != null ? resolveInput(def.input) : z.looseObject({})
  const schemaArgs = defSchemaArgs.get(def) ?? []
  const config: Parameters<typeof defineCommand>[0] = {
    name: def.name,
    description: def.description,
    input: schema,
    handler: createEsHandler(def, schemaArgs),
  }
  if (def.responseType === 'text') {
    config.formatOutput = (result) => String(result)
  }
  return defineCommand(config)
}

/**
 * Builds a lightweight stub leaf command: just name + description, no options,
 * and an action that explains the stub should have been replaced by the lazy
 * loader. The stub is used for commands the user has NOT asked to invoke -
 * Commander still shows them in group-level help, but we never pay the cost
 * of loading their Zod schemas.
 */
function buildStubLeaf (meta: EsApiMeta): OpaqueCommandHandle {
  const cmd = new Command(meta.name)
  cmd.description(meta.description)
  cmd.allowUnknownOption(true)
  cmd.action(async () => {
    // Sniffing must have missed this leaf (shouldn't normally happen - the
    // sniffer covers every direct-leaf and namespaced-leaf form). Fall back to
    // loading the definition on demand, swapping the stub for the real leaf,
    // and re-entering Commander parse so options dispatch correctly.
    const def = await loadEsApi(meta)
    const schemaArgs = validateApiDefinition(def)
    const defSchemaArgs = new Map<EsApiDefinition, SchemaArgDefinition[]>()
    defSchemaArgs.set(def, schemaArgs)
    const real = buildLeafHandle(def, defSchemaArgs)
    const parent = cmd.parent
    if (parent != null) {
      // Commander's `commands` array is typed readonly but mutated internally;
      // splice directly to swap the stub for the real leaf.
      const list = parent.commands as Command[]
      const idx = list.indexOf(cmd)
      if (idx >= 0) list.splice(idx, 1)
      parent.addCommand(real)
      await parent.parseAsync(process.argv)
    }
  })
  return cmd
}

/**
 * Parses `process.argv` to determine which ES leaf command (if any) the user
 * intends to invoke. Returns `null` when the invocation targets top-level help,
 * a namespace group without a leaf, or the helpers subtree.
 *
 * The sniff is intentionally cheap and conservative: on ambiguity it returns
 * `null`, which falls through to the stubs-only tree (correct but skips the
 * lazy-load optimisation).
 */
function sniffInvokedLeaf (argv: readonly string[], manifest: readonly EsApiMeta[]): EsApiMeta | null {
  // Find "es" positional. It is nested under "stack" in the final CLI, but this
  // module does not care about earlier tokens - we just need the first "es"
  // that is not a flag value.
  const tokens = argv.slice(2).filter((t) => !t.startsWith('-'))
  const esIdx = tokens.indexOf('es')
  if (esIdx < 0) return null

  const next = tokens[esIdx + 1]
  if (next == null || next === 'helpers') return null

  // Direct leaf form: `es <leaf>`
  const directLeaf = manifest.find((m) => m.namespace == null && m.name === next)
  if (directLeaf != null) return directLeaf

  // Namespaced leaf form: `es <namespace> <leaf>`
  const leafName = tokens[esIdx + 2]
  if (leafName == null) return null
  return manifest.find((m) => m.namespace === next && m.name === leafName) ?? null
}

/**
 * Returns the namespace token from argv if the user is targeting a specific
 * namespace (e.g. `es indices` or `es indices create`). Used to limit which
 * namespace's leaf stubs are built eagerly, keeping Commander object count low.
 */
function sniffInvokedNamespace (argv: readonly string[]): string | null {
  const tokens = argv.slice(2).filter((t) => !t.startsWith('-'))
  const esIdx = tokens.indexOf('es')
  if (esIdx < 0) return null
  const next = tokens[esIdx + 1]
  if (next == null || next === 'helpers') return null
  return next
}

interface RegisterLazyOptions {
  /** argv for sniffing the invoked leaf; defaults to `process.argv`. */
  argv?: readonly string[]
}

/**
 * Synchronously registers all Elasticsearch API commands under an `es` group
 * from an explicit list of eagerly-loaded definitions.
 *
 * Primary callers are tests and any consumer that already holds every
 * `EsApiDefinition` in memory. Production startup should prefer
 * {@link registerEsCommandsLazy} to avoid loading 294 Zod schemas up-front.
 *
 * @throws {Error} if any definition fails validation or there are duplicate names at any level
 */
export function registerEsCommands (
  definitions: EsApiDefinition[]
): OpaqueCommandHandle {
  return buildEagerTree(definitions)
}

/**
 * Lazy production path: builds the `es` command tree from the static
 * `apiManifest` (cheap metadata only). Argv is sniffed to identify the invoked
 * leaf; only that leaf's endpoint file is dynamic-imported eagerly so Commander
 * can register its Zod-derived flags before parsing. Every other leaf stays as
 * a stub that lazy-loads on demand if the sniff missed.
 *
 * Keeps startup heap bounded - see #171.
 */
export async function registerEsCommandsLazy (
  opts: RegisterLazyOptions = {}
): Promise<OpaqueCommandHandle> {
  return await buildLazyTree(apiManifest, opts.argv ?? process.argv)
}

/** Eager-tree builder: behaviourally identical to the original pre-lazy implementation. */
function buildEagerTree (definitions: EsApiDefinition[]): OpaqueCommandHandle {
  const defSchemaArgs = new Map<EsApiDefinition, SchemaArgDefinition[]>()
  for (const def of definitions) {
    defSchemaArgs.set(def, validateApiDefinition(def))
  }

  const byNamespace = new Map<string, EsApiDefinition[]>()
  const rootDefs: EsApiDefinition[] = []
  for (const def of definitions) {
    if (def.namespace !== undefined) {
      let group = byNamespace.get(def.namespace)
      if (group == null) {
        group = []
        byNamespace.set(def.namespace, group)
      }
      group.push(def)
    } else {
      rootDefs.push(def)
    }
  }

  const topLevelNames = new Set<string>()

  const namespaceHandles: OpaqueCommandHandle[] = []
  for (const [namespace, defs] of byNamespace) {
    if (topLevelNames.has(namespace)) {
      throw new Error(`duplicate command name "${namespace}" at the top level of es`)
    }
    topLevelNames.add(namespace)

    const seen = new Set<string>()
    for (const def of defs) {
      if (seen.has(def.name)) {
        throw new Error(`duplicate command name "${def.name}" in namespace "${namespace}"`)
      }
      seen.add(def.name)
    }

    const leafHandles = defs.map((def) => buildLeafHandle(def, defSchemaArgs))
    const nsHandle = defineGroup({ name: namespace, description: `Elasticsearch ${namespace} API commands` }, ...leafHandles)
    applyHelpGroup(nsHandle, NAMESPACE_GROUP)
    namespaceHandles.push(nsHandle)
  }

  rootDefs.sort((a, b) => {
    const pa = GROUP_PRIORITY[ROOT_COMMAND_GROUPS[a.name] ?? 'Other commands'] ?? 99
    const pb = GROUP_PRIORITY[ROOT_COMMAND_GROUPS[b.name] ?? 'Other commands'] ?? 99
    return pa - pb || a.name.localeCompare(b.name)
  })

  const rootHandles: OpaqueCommandHandle[] = []
  for (const def of rootDefs) {
    if (topLevelNames.has(def.name)) {
      throw new Error(`duplicate command name "${def.name}" at the top level of es`)
    }
    topLevelNames.add(def.name)
    const h = buildLeafHandle(def, defSchemaArgs)
    applyHelpGroup(h, ROOT_COMMAND_GROUPS[def.name] ?? 'Other commands')
    rootHandles.push(h)
  }

  const helpersGroup = registerHelperCommands()
  applyHelpGroup(helpersGroup, 'Helpers')

  return defineGroup({ name: 'es', description: 'Interact with the Elasticsearch API' }, ...namespaceHandles, ...rootHandles, helpersGroup)
}

/**
 * Lazy-tree builder: registers stubs for every manifest entry and, if argv
 * identifies an invoked leaf, eagerly replaces that leaf's stub with its full
 * `defineCommand`. All other leaves remain stubs.
 */
async function buildLazyTree (manifest: readonly EsApiMeta[], argv: readonly string[]): Promise<OpaqueCommandHandle> {
  const invoked = sniffInvokedLeaf(argv, manifest)
  // The namespace the user is targeting (may or may not have a specific leaf).
  // We only fully expand leaf stubs for this namespace; all others get an empty
  // group stub to keep Commander object count low at startup.
  const invokedNamespace = sniffInvokedNamespace(argv)

  // Pre-load the invoked leaf's definition so Commander can register real flags
  // before parsing (so `--help` shows them and unknown flags error as usual).
  // This is the ONE synchronous schema load per invocation - every other leaf
  // stays a stub.
  let invokedDef: EsApiDefinition | null = null
  if (invoked != null) {
    invokedDef = await loadEsApi(invoked)
  }

  const invokedSchemaArgs = new Map<EsApiDefinition, SchemaArgDefinition[]>()
  if (invokedDef != null) {
    invokedSchemaArgs.set(invokedDef, validateApiDefinition(invokedDef))
  }

  const byNamespace = new Map<string, EsApiMeta[]>()
  const rootMetas: EsApiMeta[] = []
  for (const m of manifest) {
    if (m.namespace != null) {
      let group = byNamespace.get(m.namespace)
      if (group == null) {
        group = []
        byNamespace.set(m.namespace, group)
      }
      group.push(m)
    } else {
      rootMetas.push(m)
    }
  }

  function leafHandleFor (m: EsApiMeta): OpaqueCommandHandle {
    if (invoked != null && invokedDef != null && m === invoked) {
      return buildLeafHandle(invokedDef, invokedSchemaArgs)
    }
    return buildStubLeaf(m)
  }

  const topLevelNames = new Set<string>()
  const namespaceHandles: OpaqueCommandHandle[] = []

  for (const [namespace, metas] of byNamespace) {
    if (topLevelNames.has(namespace)) {
      throw new Error(`duplicate command name "${namespace}" at the top level of es`)
    }
    topLevelNames.add(namespace)

    // Only build leaf stubs for the namespace the user is actually targeting.
    // All other namespaces get an empty group; stubs are added on-demand if the
    // user navigates to them (e.g. via the stub's action handler fall-through).
    // This keeps Commander object count proportional to the invoked namespace
    // size (worst case ~70 stubs) rather than the total manifest size (~560).
    if (namespace !== invokedNamespace) {
      const stubHandle = defineGroup({ name: namespace, description: `Elasticsearch ${namespace} API commands` })
      applyHelpGroup(stubHandle, NAMESPACE_GROUP)
      namespaceHandles.push(stubHandle)
      continue
    }

    const seen = new Set<string>()
    for (const m of metas) {
      if (seen.has(m.name)) {
        throw new Error(`duplicate command name "${m.name}" in namespace "${namespace}"`)
      }
      seen.add(m.name)
    }

    const leafHandles = metas.map(leafHandleFor)
    const nsHandle = defineGroup({ name: namespace, description: `Elasticsearch ${namespace} API commands` }, ...leafHandles)
    applyHelpGroup(nsHandle, NAMESPACE_GROUP)
    namespaceHandles.push(nsHandle)
  }

  // Root-level commands: only build stubs when the user targets root-level.
  // When a namespace is targeted, root stubs are skipped entirely.
  const rootHandles: OpaqueCommandHandle[] = []
  if (invokedNamespace == null || !byNamespace.has(invokedNamespace)) {
    rootMetas.sort((a, b) => {
      const pa = GROUP_PRIORITY[ROOT_COMMAND_GROUPS[a.name] ?? 'Other commands'] ?? 99
      const pb = GROUP_PRIORITY[ROOT_COMMAND_GROUPS[b.name] ?? 'Other commands'] ?? 99
      return pa - pb || a.name.localeCompare(b.name)
    })
    for (const m of rootMetas) {
      if (topLevelNames.has(m.name)) {
        throw new Error(`duplicate command name "${m.name}" at the top level of es`)
      }
      topLevelNames.add(m.name)
      const h = leafHandleFor(m)
      applyHelpGroup(h, ROOT_COMMAND_GROUPS[m.name] ?? 'Other commands')
      rootHandles.push(h)
    }
  }

  const helpersGroup = registerHelperCommands()
  applyHelpGroup(helpersGroup, 'Helpers')

  return defineGroup({ name: 'es', description: 'Interact with the Elasticsearch API' }, ...namespaceHandles, ...rootHandles, helpersGroup)
}
