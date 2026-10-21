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
  getDownstreamProjectsMoon,
  getModuleLookup,
} from '../../affected-packages/index.ts';
import type { MoonTaskAffectedReasons } from '../../affected-packages/index.ts';

import type { FTRManifestEntry } from './ftr_manifests.ts';
import {
  FTR_ALWAYS_RUN_CONFIGS,
  FTR_CRITICAL_PATHS,
  FTR_EXCLUDED_MODULES,
  FTR_IRRELEVANT_PATHS,
} from './selective_ftr.ts';

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
      /** Paths of configs outside `domains` that run anyway (see `resolveFtrDomains`). */
      readonly extraConfigs: ReadonlySet<string>;
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

/**
 * The repo graph with its downstream closure taken from moon's project graph instead, by
 * handing moon each module's `kibana.jsonc`.
 */
export const createMoonFtrModuleGraph = (): FtrModuleGraph => {
  const { byId } = getModuleLookup();
  return {
    ...createRepoFtrModuleGraph(),
    downstreamOf: (moduleIds) => {
      const files = [...moduleIds].map((moduleId) => {
        const dir = byId.get(moduleId);
        if (dir === undefined) {
          throw new Error(`no directory known for module ${moduleId}`);
        }
        return `${dir}/kibana.jsonc`;
      });
      return new Set([...moduleIds, ...getDownstreamProjectsMoon(files)]);
    },
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
 * and all of `base`. Configs outside the selected domains still run when a closure module owns
 * them, when they are platform configs filed in a solution manifest and `platform` is selected,
 * or when they are in `FTR_ALWAYS_RUN_CONFIGS`. Falls back to all domains whenever the diff
 * can't be attributed safely.
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
    extraConfigs: new Set(),
    reason: '',
  };

  const ownedConfigs: string[] = [];
  const platformConfigs: string[] = [];
  const alwaysRunConfigs: string[] = [];
  for (const entry of manifestEntries) {
    if (includesFtrEntry(domainSelection, entry)) continue;
    const owner = graph.moduleForPath(entry.path);
    if (owner !== undefined && closure.has(owner)) {
      // Configs owned by an affected module run even when filed under another domain's manifest
      // (e.g. solution-located configs in the platform manifest, or the reverse).
      ownedConfigs.push(entry.path);
    } else if (
      domains.has(PLATFORM_DOMAIN) &&
      owner !== undefined &&
      owner !== UNCATEGORIZED_MODULE_ID &&
      (graph.groupOf(owner) ?? PLATFORM_DOMAIN) === PLATFORM_DOMAIN
    ) {
      // Platform configs in solution manifests run platform UIs inside that solution's serverless
      // project; no test suite imports the plugins they exercise.
      platformConfigs.push(entry.path);
    } else if (domains.size > 0 && FTR_ALWAYS_RUN_CONFIGS.has(entry.path)) {
      alwaysRunConfigs.push(entry.path);
    }
  }

  const reasons = [...triggers].map(([domain, trigger]) => `${domain} ← ${trigger}`);
  if (ownedConfigs.length) {
    reasons.push(`configs owned by affected modules: ${listFiles(ownedConfigs)}`);
  }
  if (platformConfigs.length) {
    reasons.push(`platform configs in solution manifests: ${listFiles(platformConfigs)}`);
  }
  if (alwaysRunConfigs.length) {
    reasons.push(`always-run configs: ${listFiles(alwaysRunConfigs)}`);
  }
  const reason = reasons.length
    ? reasons.join('; ')
    : 'only FTR-irrelevant files or FTR-excluded modules changed';

  const extraConfigs = new Set([...ownedConfigs, ...platformConfigs, ...alwaysRunConfigs]);
  const selection: FtrDomainSelection = { all: false, domains, extraConfigs, reason };
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
  const { domains, extraConfigs } = selection;
  if (extraConfigs.has(entry.path)) return true;
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

/** Manifest config paths only one of the git and moon selections runs. */
export const diffFtrDomainSelections = (
  { git, moon }: { git: FtrDomainSelection; moon: FtrDomainSelection },
  manifestEntries: readonly FTRManifestEntry[]
): { onlyGit: string[]; onlyMoon: string[] } => {
  const onlyGit: string[] = [];
  const onlyMoon: string[] = [];
  for (const entry of manifestEntries) {
    const inGit = includesFtrEntry(git, entry);
    const inMoon = includesFtrEntry(moon, entry);
    if (inGit && !inMoon) onlyGit.push(entry.path);
    if (inMoon && !inGit) onlyMoon.push(entry.path);
  }
  return { onlyGit, onlyMoon };
};

/** The moon task (`.buildkite/moon.yml`) whose affected reasons give the FTR domains. */
export const FTR_MOON_TASK = { project: 'kibana-buildkite', task: 'ftr' } as const;

/**
 * Picks FTR domains from why moon considers the `ftr` task affected. Changed `ftrCritical`
 * inputs run every domain; each affected `<project>:source-upstream` dep (the project or
 * something it imports changed) adds its kibana.jsonc group, with `platform` and ungrouped
 * projects adding `platform` and `base`. Code only handles what moon can't see: FTR-excluded
 * modules, changed modules without a group, and relevant files outside any project. Extra
 * configs (owned, platform-in-solution, always-run) are not part of this answer.
 */
export const resolveFtrDomainsWithMoonTask = ({
  changedFiles,
  graph,
  getAffectedReasons,
}: {
  changedFiles: readonly string[];
  graph: Pick<FtrModuleGraph, 'moduleForPath' | 'groupOf'>;
  /** Why the files affect `FTR_MOON_TASK`, or undefined when they don't. */
  getAffectedReasons: (files: readonly string[]) => MoonTaskAffectedReasons | undefined;
}): FtrDomainSelection => {
  if (changedFiles.length === 0) {
    return all('no changed files');
  }

  const isIrrelevant = createScopeMatcher(FTR_IRRELEVANT_PATHS);
  const moonFiles: string[] = [];
  for (const file of changedFiles) {
    const moduleId = graph.moduleForPath(file);
    const outsideModules = moduleId === undefined || moduleId === UNCATEGORIZED_MODULE_ID;
    if (outsideModules) {
      // Irrelevant files outside modules still go to moon: `ftrCritical` inputs match some of
      // them (e.g. .buildkite/ftr-manifests), and moon ignores the rest.
      if (!isIrrelevant(file)) return all(`file outside any module changed: ${file}`);
      moonFiles.push(file);
      continue;
    }
    if (isIrrelevant(file) || FTR_EXCLUDED_MODULES.has(moduleId)) continue;
    if (graph.groupOf(moduleId) === undefined) {
      return all(`changed module has no group: ${moduleId}`);
    }
    moonFiles.push(file);
  }

  const reasons = getAffectedReasons(moonFiles);
  if (reasons && reasons.files.length > 0) {
    return all(`FTR-critical files changed (moon): ${listFiles(reasons.files)}`);
  }

  // domain → project that pulled it in, for the annotation
  const triggers = new Map<string, string>();
  for (const target of reasons?.upstream ?? []) {
    const project = target.slice(0, target.lastIndexOf(':'));
    const group = graph.groupOf(project) ?? PLATFORM_DOMAIN;
    const domains = group === PLATFORM_DOMAIN ? [PLATFORM_DOMAIN, BASE_DOMAIN] : [group];
    for (const domain of domains) {
      if (!triggers.has(domain)) triggers.set(domain, project);
    }
  }

  return {
    all: false,
    domains: new Set(triggers.keys()),
    extraConfigs: new Set(),
    reason: triggers.size
      ? [...triggers].map(([domain, project]) => `${domain} ← ${project}`).join('; ')
      : 'moon ftr task not affected',
  };
};

/** Domains a selection runs; `all` means every domain in the manifests. */
export const selectedFtrDomains = (
  selection: FtrDomainSelection,
  manifestEntries: readonly FTRManifestEntry[]
): Set<string> =>
  selection.all
    ? new Set(manifestEntries.map((entry) => entry.domain))
    : new Set(selection.domains);
