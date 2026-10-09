/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  UNCATEGORIZED_MODULE_ID,
  createScopeMatcher,
  findModuleForPath,
  getDownstreamDependents,
  getModuleLookup,
} from '../../affected-packages/index.ts';

import type { FTRManifestEntry } from './ftr_manifests.ts';
import { FTR_CRITICAL_PATHS, FTR_EXCLUDED_MODULES, FTR_IRRELEVANT_PATHS } from './selective_ftr.ts';

const PLATFORM_DOMAIN = 'platform';
const BASE_DOMAIN = 'base';
const MAX_LISTED_FILES = 5;

/** Module graph queries the resolver needs; injectable for tests. */
export interface FtrModuleGraph {
  /** Owning module ID, or undefined / `UNCATEGORIZED_MODULE_ID` for files outside any module. */
  moduleForPath(filePath: string): string | undefined;
  /** `group` from kibana.jsonc, or undefined when the module declares none. */
  groupOf(moduleId: string): string | undefined;
  /** The given modules plus every module that transitively references them. */
  downstreamOf(moduleIds: ReadonlySet<string>): ReadonlySet<string>;
}

export type FtrDomainSelection =
  | { readonly all: true; readonly reason: string }
  | {
      readonly all: false;
      readonly domains: ReadonlySet<string>;
      /** Paths of configs outside `domains` that belong to an affected module. */
      readonly ownedConfigs: ReadonlySet<string>;
      readonly reason: string;
    };

/** Module graph backed by the repo's kibana.jsonc / tsconfig.json kbn_references. */
export const createRepoFtrModuleGraph = (): FtrModuleGraph => {
  const { groupById } = getModuleLookup();
  return {
    moduleForPath: findModuleForPath,
    groupOf: (moduleId) => groupById.get(moduleId),
    downstreamOf: getDownstreamDependents,
  };
};

const all = (reason: string): FtrDomainSelection => ({ all: true, reason });

const listFiles = (files: readonly string[]): string => {
  const shown = files.slice(0, MAX_LISTED_FILES).join(', ');
  const omitted = files.length - MAX_LISTED_FILES;
  return omitted > 0 ? `${shown}, and ${omitted} more` : shown;
};

/**
 * Picks the FTR manifest domains a PR diff can affect. Domains come from the `group` of every
 * module in the downstream closure of the changed modules; a platform module adds `platform`
 * and all of `base`. Configs owned by a closure module also run, whichever manifest lists them.
 * Falls back to all domains whenever the diff can't be attributed safely.
 */
export const resolveFtrDomains = ({
  changedFiles,
  manifestEntries,
  graph,
}: {
  changedFiles: readonly string[];
  manifestEntries: readonly FTRManifestEntry[];
  graph: FtrModuleGraph;
}): FtrDomainSelection => {
  if (changedFiles.length === 0) {
    return all('no changed files');
  }

  const isCritical = createScopeMatcher(FTR_CRITICAL_PATHS);
  const criticalFiles = changedFiles.filter(isCritical);
  if (criticalFiles.length > 0) {
    return all(`FTR-critical files changed: ${listFiles(criticalFiles)}`);
  }

  const isIrrelevant = createScopeMatcher(FTR_IRRELEVANT_PATHS);
  const directModules = new Set<string>();
  for (const file of changedFiles) {
    if (isIrrelevant(file)) continue;

    const moduleId = graph.moduleForPath(file);
    if (moduleId === undefined || moduleId === UNCATEGORIZED_MODULE_ID) {
      return all(`file outside any module changed: ${file}`);
    }
    if (FTR_EXCLUDED_MODULES.has(moduleId)) continue;
    if (graph.groupOf(moduleId) === undefined) {
      return all(`changed module has no group: ${moduleId}`);
    }
    directModules.add(moduleId);
  }

  const closure = graph.downstreamOf(directModules);

  // domain → module that pulled it in, for the annotation
  const triggers = new Map<string, string>();
  const addDomain = (domain: string, trigger: string) => {
    if (!triggers.has(domain)) triggers.set(domain, trigger);
  };

  for (const moduleId of closure) {
    // Closure modules without a group are test plugins / tooling that load like platform code.
    const group = graph.groupOf(moduleId) ?? PLATFORM_DOMAIN;
    if (group === PLATFORM_DOMAIN) {
      addDomain(PLATFORM_DOMAIN, moduleId);
      addDomain(BASE_DOMAIN, moduleId);
    } else {
      addDomain(group, moduleId);
    }
  }

  const domains = new Set(triggers.keys());
  const domainSelection: FtrDomainSelection = {
    all: false,
    domains,
    ownedConfigs: new Set(),
    reason: '',
  };

  // Configs owned by an affected module run even when filed under another domain's manifest
  // (e.g. solution-located configs in the platform manifest, or the reverse).
  const ownedConfigs = new Set<string>();
  for (const entry of manifestEntries) {
    if (includesFtrEntry(domainSelection, entry)) continue;
    const owner = graph.moduleForPath(entry.path);
    if (owner !== undefined && closure.has(owner)) {
      ownedConfigs.add(entry.path);
    }
  }

  const reasons = [...triggers].map(([domain, trigger]) => `${domain} ← ${trigger}`);
  if (ownedConfigs.size) {
    reasons.push(`configs owned by affected modules: ${listFiles([...ownedConfigs])}`);
  }
  const reason = reasons.length
    ? reasons.join('; ')
    : 'only FTR-irrelevant files or FTR-excluded modules changed';

  const selection: FtrDomainSelection = { all: false, domains, ownedConfigs, reason };
  return manifestEntries.every((entry) => includesFtrEntry(selection, entry))
    ? all(`every domain affected: ${reason}`)
    : selection;
};

/**
 * True when the entry runs under the selection. A `base` entry runs for platform changes,
 * for changes to the solution whose serverless project it boots, or always when it
 * declares no project.
 */
export const includesFtrEntry = (
  selection: FtrDomainSelection,
  entry: Pick<FTRManifestEntry, 'path' | 'domain' | 'project'>
): boolean => {
  if (selection.all) return true;
  const { domains, ownedConfigs } = selection;
  if (ownedConfigs.has(entry.path)) return true;
  if (entry.domain === BASE_DOMAIN) {
    return domains.has(BASE_DOMAIN) || entry.project === undefined || domains.has(entry.project);
  }
  return domains.has(entry.domain);
};

/** Per-domain `name (included/total)` lists of selected and skipped manifest domains. */
export const summarizeFtrDomainSelection = (
  selection: FtrDomainSelection,
  manifestEntries: readonly FTRManifestEntry[]
): { selected: string[]; skipped: string[] } => {
  const counts = new Map<string, { included: number; total: number }>();
  for (const entry of manifestEntries) {
    const count = counts.get(entry.domain) ?? { included: 0, total: 0 };
    count.total++;
    if (includesFtrEntry(selection, entry)) count.included++;
    counts.set(entry.domain, count);
  }

  const selected: string[] = [];
  const skipped: string[] = [];
  for (const [domain, { included, total }] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
    if (included > 0) {
      selected.push(included === total ? domain : `${domain} (${included}/${total} configs)`);
    }
    if (included < total) {
      skipped.push(included === 0 ? domain : `${domain} (${total - included}/${total} configs)`);
    }
  }
  return { selected, skipped };
};
