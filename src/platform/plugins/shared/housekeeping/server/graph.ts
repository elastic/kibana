/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/core/server';
import type {
  HousekeepingFindingGroup,
  HousekeepingResource,
  HousekeepingResourceUser,
  HousekeepingSkippedCheck,
} from '../common';
import type {
  HousekeepingReference,
  HousekeepingResourceEntry,
  HousekeepingResourceProvider,
  HousekeepingResourceTypeDefinition,
  HousekeepingUnusedNotChecked,
} from './types';

export interface ProviderResult {
  provider: HousekeepingResourceProvider;
  /** Undefined when the provider failed. */
  resources?: HousekeepingResourceEntry[];
  unusedNotChecked?: HousekeepingUnusedNotChecked[];
}

interface BuildGraphFindingsOptions {
  results: ProviderResult[];
  /** Every registered provider, to know who else could reference a resource. */
  providers: HousekeepingResourceProvider[];
  resourceTypes: HousekeepingResourceTypeDefinition[];
  logger?: Logger;
}

interface GraphFindings {
  groups: HousekeepingFindingGroup[];
  skipped: HousekeepingSkippedCheck[];
}

/** The resources of each type that a provider listed. Types that nobody listed are missing. */
type ResourceIndex = Map<string, Map<string, HousekeepingResourceEntry>>;

/** Every reference from one source to one missing target, whatever setting holds it. */
interface BrokenReference {
  source: HousekeepingResourceEntry;
  reference: HousekeepingReference;
  vias: string[];
  impacts: string[];
}

/** Whether unused resources of a type can be reported, and why not. */
type UnusedReportability =
  | { outcome: 'report' }
  | { outcome: 'skip'; message: string }
  /** Referencers outside a scoped run: report nothing, without telling the user. */
  | { outcome: 'ignore' };

const MAX_EVIDENCE_ITEMS = 30;

const toKey = ({ type, id }: Pick<HousekeepingResource, 'type' | 'id'>) => `${type}:${id}`;

const toTargetKey = ({ targetType, targetId }: HousekeepingReference) =>
  toKey({ type: targetType, id: targetId });

const toBrokenKey = ({ source, reference }: Pick<BrokenReference, 'source' | 'reference'>) =>
  `${toKey(source)}|${toTargetKey(reference)}`;

const addTo = <T>(map: Map<string, T[]>, key: string, item: T) => {
  const items = map.get(key);
  if (items) {
    items.push(item);
  } else {
    map.set(key, [item]);
  }
};

/** Adds the locator that the resource type registered, so the UI can link to the owning plugin. */
export const createLocateResource = (resourceTypes: HousekeepingResourceTypeDefinition[]) => {
  const locators = new Map(resourceTypes.map(({ id, locator }) => [id, locator]));
  return (resource: HousekeepingResource): HousekeepingResource => {
    const locator = locators.get(resource.type);
    return locator
      ? { ...resource, locator: { id: locator.id, params: locator.getParams(resource.id) } }
      : resource;
  };
};

const ownsType = (provider: HousekeepingResourceProvider, type: string) =>
  provider.resourceTypes.some(({ id }) => id === type);

const referencesType = (provider: HousekeepingResourceProvider, type: string) =>
  provider.referencedTypes?.includes(type) || ownsType(provider, type);

const indexResources = (results: ProviderResult[], logger?: Logger): ResourceIndex => {
  const listed = results.flatMap(({ provider, resources }) =>
    resources ? [{ provider, resources }] : []
  );
  const index: ResourceIndex = new Map(
    listed.flatMap(({ provider }) => provider.resourceTypes.map(({ id }) => [id, new Map()]))
  );
  const undeclared = new Set<string>();

  for (const { provider, resources } of listed) {
    for (const resource of resources) {
      if (!ownsType(provider, resource.type)) {
        logger?.warn(
          `Housekeeping provider [${provider.id}] listed [${toKey(
            resource
          )}], a type it doesn't own`
        );
        continue;
      }
      index.get(resource.type)?.set(resource.id, resource);

      // Otherwise a run without this provider reports the targets as unused.
      for (const { targetType } of resource.references ?? []) {
        const key = `${provider.id}|${targetType}`;
        if (!referencesType(provider, targetType) && !undeclared.has(key)) {
          undeclared.add(key);
          logger?.warn(
            `Housekeeping provider [${provider.id}] references [${targetType}], a type missing from its referencedTypes`
          );
        }
      }
    }
  }
  return index;
};

/** Who uses each existing resource, and which references point at a resource that doesn't exist. */
const followReferences = (
  index: ResourceIndex
): { usedBy: Map<string, HousekeepingResourceUser[]>; broken: BrokenReference[] } => {
  const usedBy = new Map<string, HousekeepingResourceUser[]>();
  const broken = new Map<string, BrokenReference>();

  const references = [...index.values()]
    .flatMap((resources) => [...resources.values()])
    .flatMap((source) => (source.references ?? []).map((reference) => ({ source, reference })));

  for (const { source, reference } of references) {
    const targets = index.get(reference.targetType);
    // Nobody could list the target type, so the reference can't be judged.
    if (!targets) {
      continue;
    }

    const targetKey = toTargetKey(reference);
    if (targets.has(reference.targetId)) {
      // A resource that only points at itself is still unused.
      if (targetKey !== toKey(source)) {
        addTo(usedBy, targetKey, { type: source.type, id: source.id, via: reference.via });
      }
    } else if (!reference.optional && !source.isManaged) {
      const key = toBrokenKey({ source, reference });
      const existing = broken.get(key) ?? { source, reference, vias: [], impacts: [] };
      existing.vias.push(reference.via);
      if (reference.impact && !existing.impacts.includes(reference.impact)) {
        existing.impacts.push(reference.impact);
      }
      broken.set(key, existing);
    }
  }

  return { usedBy, broken: [...broken.values()] };
};

interface GroupContext {
  index: ResourceIndex;
  usedBy: Map<string, HousekeepingResourceUser[]>;
  types: Map<string, HousekeepingResourceTypeDefinition>;
  toResource: (entry: HousekeepingResourceEntry) => HousekeepingResource;
}

const brokenReferenceGroups = (
  broken: BrokenReference[],
  { index, usedBy, types, toResource }: GroupContext
): HousekeepingFindingGroup[] => {
  const byTargetType = new Map<string, BrokenReference[]>();
  broken.forEach((item) => addTo(byTargetType, item.reference.targetType, item));

  return [...byTargetType].map(([targetType, references]) => {
    const target = types.get(targetType);
    // For the agent: what the references could point to instead.
    const existing = [...(index.get(targetType)?.values() ?? [])]
      .filter(({ id, isManaged }) => !isManaged && !id.startsWith('.'))
      .map(({ id }) => id);

    return {
      id: `broken_reference:${targetType}`,
      kind: 'broken_reference',
      title: i18n.translate('housekeeping.brokenReference.groupTitle', {
        defaultMessage: 'Missing {label}',
        values: { label: (target?.label ?? targetType).toLowerCase() },
      }),
      description: i18n.translate('housekeeping.brokenReference.groupDescription', {
        defaultMessage: 'The resources below point to something that does not exist.',
      }),
      findings: references.map(({ source, reference, vias, impacts }) => {
        const users = usedBy.get(toKey(source)) ?? [];
        return {
          id: `broken_reference|${toBrokenKey({ source, reference })}`,
          resource: toResource(source),
          related: [{ type: targetType, id: reference.targetId }],
          message: impacts.length ? impacts.join(' ') : undefined,
          details: [
            i18n.translate('housekeeping.brokenReference.via', {
              defaultMessage:
                '{via} {count, plural, one {points} other {point}} to {target}, which does not exist.',
              values: { via: vias.join(', '), count: vias.length, target: reference.targetId },
            }),
          ],
          evidence: {
            ...source.evidence,
            via: vias,
            usedBy: users.slice(0, MAX_EVIDENCE_ITEMS),
            usedByCount: users.length,
            [`existing_${targetType}`]: existing.slice(0, MAX_EVIDENCE_ITEMS),
            existingCount: existing.length,
          },
        };
      }),
    };
  });
};

/**
 * Unused resources can only be told apart from unseen ones when every provider that could point
 * at them listed its resources.
 */
const canReportUnused = (
  type: HousekeepingResourceTypeDefinition,
  results: ProviderResult[],
  providers: HousekeepingResourceProvider[]
): UnusedReportability => {
  const hasListed = (provider: HousekeepingResourceProvider) =>
    results.some((result) => result.provider === provider && result.resources);
  const hasRun = (provider: HousekeepingResourceProvider) =>
    results.some((result) => result.provider === provider);

  const missing = providers.filter(
    (provider) => referencesType(provider, type.id) && !hasListed(provider)
  );
  const failed = missing.filter(hasRun);
  if (failed.length > 0) {
    return {
      outcome: 'skip',
      message: i18n.translate('housekeeping.unused.incompleteMessage', {
        defaultMessage: 'Not checked because {providers} could not list their resources.',
        values: { providers: failed.map(({ title }) => title).join(', ') },
      }),
    };
  }
  if (missing.length > 0) {
    return { outcome: 'ignore' };
  }

  const notChecked = results
    .flatMap((result) => result.unusedNotChecked ?? [])
    .find((entry) => entry.type === type.id);
  return notChecked ? { outcome: 'skip', message: notChecked.reason } : { outcome: 'report' };
};

const unusedGroups = (
  results: ProviderResult[],
  providers: HousekeepingResourceProvider[],
  { index, usedBy, types, toResource }: GroupContext
): GraphFindings => {
  const groups: HousekeepingFindingGroup[] = [];
  const skipped: HousekeepingSkippedCheck[] = [];

  for (const type of types.values()) {
    const { unused } = type;
    const resources = index.get(type.id);
    if (!unused || !resources) {
      continue;
    }

    const id = `unused:${type.id}`;
    const title = i18n.translate('housekeeping.unused.groupTitle', {
      defaultMessage: 'Unused {label}',
      values: { label: type.label.toLowerCase() },
    });

    const reportability = canReportUnused(type, results, providers);
    if (reportability.outcome === 'skip') {
      skipped.push({
        checkId: id,
        checkTitle: title,
        reason: 'incomplete',
        message: reportability.message,
      });
    }
    if (reportability.outcome !== 'report') {
      continue;
    }

    const findings = [...resources.values()]
      .filter((resource) => !resource.inUse && !usedBy.has(toKey(resource)))
      .map((resource) => ({
        id: `unused|${toKey(resource)}`,
        resource: toResource(resource),
        related: [],
        details: resource.details,
        fix: unused.getFix?.(resource.id),
        evidence: resource.evidence,
      }));
    if (findings.length > 0) {
      groups.push({
        id,
        kind: 'unused',
        title,
        description: unused.message,
        findings,
      });
    }
  }

  return { groups, skipped };
};

export const buildGraphFindings = ({
  results,
  providers,
  resourceTypes,
  logger,
}: BuildGraphFindingsOptions): GraphFindings => {
  const locateResource = createLocateResource(resourceTypes);
  // Only these fields reach the browser.
  const toResource = ({ type, id, isManaged }: HousekeepingResourceEntry) =>
    locateResource({ type, id, isManaged });

  const index = indexResources(results, logger);
  const { usedBy, broken } = followReferences(index);
  const context: GroupContext = {
    index,
    usedBy,
    types: new Map(resourceTypes.map((type) => [type.id, type])),
    toResource,
  };
  const unused = unusedGroups(results, providers, context);

  return {
    groups: [...brokenReferenceGroups(broken, context), ...unused.groups],
    skipped: unused.skipped,
  };
};
