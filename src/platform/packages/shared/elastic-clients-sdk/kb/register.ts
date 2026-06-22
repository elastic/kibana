/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Command } from 'commander'
import { z } from '@kbn/zod/v4'
import { defineCommand, defineGroup } from '../factory'
import type { OpaqueCommandHandle } from '../factory'
import type { KbApiDefinition, KbPathParam, KbQueryParam, KbBodyParam } from './types'
import { validateKbApiDefinition } from './types'
import { kbApiManifest, loadKbApi } from './apis'
import type { KbApiMeta } from './api-manifest'
import { createKbHandler } from './handler'

/**
 * Builds the unified flat Zod schema for a Kibana API command.
 *
 * Path params, query params, and body params are combined into a single `z.object`
 * so the factory registers them as CLI flags, merges --file/stdin input, validates,
 * and delivers the whole thing to the handler as `parsed.input`.
 */
export function buildCommandSchema (def: KbApiDefinition): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodType> = {}

  for (const p of def.pathParams ?? []) {
    shape[p.name] = pathParamToZod(p)
  }

  for (const q of def.queryParams ?? []) {
    shape[q.cliFlag ?? q.name] = queryParamToZod(q)
  }

  for (const b of def.bodyParams ?? []) {
    shape[b.cliFlag ?? b.name] = bodyParamToZod(b)
  }

  return z.looseObject(shape)
}

function pathParamToZod (p: KbPathParam): z.ZodType {
  const base = z.string().describe(p.description)
  return p.required ? base : base.optional()
}

function queryParamToZod (q: KbQueryParam): z.ZodType {
  const base =
    q.type === 'boolean' ? z.boolean().describe(q.description) :
    q.type === 'number' ? z.number().describe(q.description) :
      z.string().describe(q.description)
  return q.required === true ? base : base.optional()
}

function bodyParamToZod (b: KbBodyParam): z.ZodType {
  let base: z.ZodType
  switch (b.type) {
    case 'boolean': base = z.boolean().describe(b.description); break
    case 'number': base = z.number().describe(b.description); break
    case 'array': base = z.array(z.unknown()).describe(b.description); break
    case 'object': base = z.record(z.string(), z.unknown()).describe(b.description); break
    default: base = z.string().describe(b.description); break
  }
  return b.required === true ? base : base.optional()
}

/** Builds a leaf command handle from a definition. */
function buildLeafHandle (def: KbApiDefinition): OpaqueCommandHandle {
  const schema = buildCommandSchema(def)
  return defineCommand({
    name: def.name,
    description: def.description,
    input: schema,
    handler: createKbHandler(def)
  })
}

/**
 * Builds a stub leaf command that loads its full definition on demand.
 * Commander still shows the stub in group-level help.
 */
function buildStubLeaf (meta: KbApiMeta): OpaqueCommandHandle {
  const cmd = new Command(meta.name)
  cmd.description(meta.description)
  cmd.allowUnknownOption(true)
  cmd.action(async () => {
    const def = await loadKbApi(meta)
    const real = buildLeafHandle(def)
    const parent = cmd.parent
    if (parent != null) {
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
 * Sniffs `process.argv` to identify which KB leaf command the user
 * intends to invoke. Returns `null` on ambiguity or help requests.
 */
function sniffInvokedLeaf (argv: readonly string[], manifest: readonly KbApiMeta[]): KbApiMeta | null {
  const kbIdx = argv.findIndex((a, i) => i >= 2 && (a === 'kb' || a === 'kibana'))
  if (kbIdx < 0) return null

  const afterKb = argv.slice(kbIdx + 1).filter(a => !a.startsWith('-'))
  if (afterKb.length === 0) return null

  const namespaces = new Set(manifest.map(m => m.namespace))

  if (afterKb.length >= 2 && namespaces.has(afterKb[0]!)) {
    const ns = afterKb[0]!
    const leaf = afterKb[1]!
    return manifest.find(m => m.namespace === ns && m.name === leaf) ?? null
  }

  if (afterKb.length >= 1 && !namespaces.has(afterKb[0]!)) {
    const leaf = afterKb[0]!
    return manifest.find(m => m.name === leaf) ?? null
  }

  return null
}

export interface RegisterLazyOptions {
  argv?: readonly string[]
}

/**
 * Lazily registers all Kibana API commands. Only the invoked endpoint's
 * namespace file is loaded; everything else stays as lightweight stubs.
 */
export async function registerKbCommandsLazy (
  opts: RegisterLazyOptions = {}
): Promise<OpaqueCommandHandle> {
  const argv = opts.argv ?? process.argv
  const invoked = sniffInvokedLeaf(argv, kbApiManifest)

  let invokedDef: KbApiDefinition | null = null
  if (invoked != null) {
    invokedDef = await loadKbApi(invoked)
  }

  const byNamespace = new Map<string, KbApiMeta[]>()
  for (const m of kbApiManifest) {
    let group = byNamespace.get(m.namespace)
    if (group == null) {
      group = []
      byNamespace.set(m.namespace, group)
    }
    group.push(m)
  }

  function leafHandleFor (m: KbApiMeta): OpaqueCommandHandle {
    if (invoked != null && invokedDef != null && m === invoked) {
      return buildLeafHandle(invokedDef)
    }
    return buildStubLeaf(m)
  }

  const namespaceHandles: OpaqueCommandHandle[] = []
  for (const [namespace, metas] of byNamespace) {
    const leafHandles = metas.map(leafHandleFor)
    namespaceHandles.push(
      defineGroup({ name: namespace, description: `Kibana ${namespace} API commands` }, ...leafHandles)
    )
  }

  return defineGroup(
    { name: 'kb', description: 'Interact with the Kibana API' },
    ...namespaceHandles
  )
}

/**
 * Eagerly registers all Kibana API commands (for tests and scripts).
 * Requires all definitions to be passed in.
 */
export function registerKbCommands (
  definitions: KbApiDefinition[]
): OpaqueCommandHandle {
  for (const def of definitions) {
    validateKbApiDefinition(def)
  }

  const byNamespace = new Map<string, KbApiDefinition[]>()
  for (const def of definitions) {
    let group = byNamespace.get(def.namespace)
    if (group == null) {
      group = []
      byNamespace.set(def.namespace, group)
    }
    group.push(def)
  }

  const namespaceHandles: OpaqueCommandHandle[] = []
  for (const [namespace, defs] of byNamespace) {
    const seen = new Set<string>()
    for (const def of defs) {
      if (seen.has(def.name)) {
        throw new Error(`duplicate command name "${def.name}" in namespace "${namespace}"`)
      }
      seen.add(def.name)
    }

    const leafHandles = defs.map((def) => buildLeafHandle(def))
    namespaceHandles.push(
      defineGroup({ name: namespace, description: `Kibana ${namespace} API commands` }, ...leafHandles)
    )
  }

  return defineGroup(
    { name: 'kb', description: 'Interact with the Kibana API' },
    ...namespaceHandles
  )
}
