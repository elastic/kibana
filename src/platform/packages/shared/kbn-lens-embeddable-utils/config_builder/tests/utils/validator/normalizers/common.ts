/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { orderBy } from 'lodash';

import { LEGACY_COMPLIMENTARY_PALETTE, COMPLEMENTARY_PALETTE } from '@kbn/coloring';
import type { ColorMapping, CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { Reference } from '@kbn/content-management-utils';
import type {
  DataType,
  FormBasedPersistedState,
  GenericIndexPatternColumn,
  ReferenceBasedIndexPatternColumn,
  TextBasedPersistedState,
} from '@kbn/lens-common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { LENS_ITEM_LATEST_VERSION } from '@kbn/lens-common/content_management/constants';

import { getIndexPatternFromESQLQuery, parseTimeFieldFromESQLQuery } from '@kbn/esql-utils';
import { migrateFilter } from '@kbn/es-query';
import type { Filter, FilterMeta } from '@kbn/es-query';

import {
  LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE,
  LENS_SAMPLING_DEFAULT_VALUE,
} from '../../../../schema/constants';
import type { LensAttributes } from '../../../../types';
import { getValues, type NormalizerConfig } from './normalize';
import { getContinuity, getRangeValue } from '../../../../transforms/coloring';
import { stripUndefined } from '../../../../transforms/charts/utils';
import { generateAdHocDataViewId, getAdHocDataViewSpec } from '../../../../transforms/utils';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const COMMON_STATE_IGNORE_PATHS = [
  'savedObjectId', // panel-level SO reference, not part of LensAttributes
  // 'state.filters', // remove for now
  'state.visualization.title', // removed by-value nested title
  // TODO: check missing properties striped out in transforms
  'state.datasourceStates.formBased.layers.*.indexPatternId',
  'state.datasourceStates.formBased.currentIndexPatternId',
  // Label and customLabel diffs
  'state.datasourceStates.*.layers.*.columns.*.label', // is kept at state -> API only if it is a custom label
  'state.datasourceStates.*.layers.*.columns.*.customLabel', // dropped at state -> API and only applied from API -> State if label is explicitly set
  // TODO: check DSL differing properties changed in transforms
  'state.datasourceStates.formBased.layers.*.columns.*.params',
  'state.datasourceStates.formBased.layers.*.columns.*.scale', // conditionally set for data columns
  // TODO: check missing ES|QL column properties stripped out in transforms
  'state.datasourceStates.textBased.layers.*.columns.*.inMetricDimension', // dropped at state -> API and only applied from API -> State if explicitly set
  'state.datasourceStates.textBased.layers.*.columns.*.meta', // meta is inferred by the transform -> originals may have it, miss it, or have different values
  'state.datasourceStates.textBased.layers.*.allColumns', // runtime-only property, not persisted or produced by transform
  'state.datasourceStates.textBased.layers.*.timeField', // inferred at runtime from the data view -> original may have undefined while transform sets @timestamp from query.esql
  // TODO: check missing/different properties on colorMapping
  'state.visualization.columns.*.colorMapping.assignments.*.touched', // dropped at state -> API and only applied from API -> State, hardcoded to false by transform
  'state.visualization.columns.*.colorMapping.specialAssignments.*.touched',
  'state.visualization.layers.*.colorMapping.assignments.*.touched',
  'state.visualization.layers.*.colorMapping.specialAssignments.*.touched',
  'state.visualization.layers.*.colorMapping.colorMode.steps.*.touched',
  'state.visualization.colorMapping.colorMode.steps.*.touched',
];

export const DEFAULT_LAYER_ID = 'layer_0';

export type IdRemapping = Array<[old: string | undefined, new: string]>;

/**
 * Resolve the form-based datasource state, falling back to the legacy
 * `indexpattern` key.
 */
export const getFormBasedDatasourceState = (
  datasourceStates: LensAttributes['state']['datasourceStates']
): FormBasedPersistedState | undefined =>
  datasourceStates.formBased ?? ((datasourceStates as any).indexpattern as FormBasedPersistedState);

export const isReferenceBasedColumn = (
  c: GenericIndexPatternColumn
): c is ReferenceBasedIndexPatternColumn => 'references' in c && Array.isArray(c.references);
/**
 * ES|QL ad-hoc data views: remap existing ones to deterministic IDs or create
 * new ones from the ES|QL query. Returns rebuilt internalReferences with standard naming.
 */
function normalizeESQLAdHocDataViews(
  attributes: LensAttributes,
  internalReferences: Reference[]
): Reference[] {
  if (
    attributes.state.datasourceStates.textBased &&
    'indexPatternRefs' in attributes.state.datasourceStates.textBased
  ) {
    delete attributes.state.datasourceStates.textBased.indexPatternRefs;
  }

  const textBasedLayerEntries = Object.entries(
    attributes.state.datasourceStates.textBased?.layers ?? {}
  );
  if (textBasedLayerEntries.length === 0) return internalReferences;

  // Remove 'textBasedLanguages-datasource-layer-*' references — they are rebuilt below
  const refs = internalReferences.filter(
    (r) => !r.name.startsWith('textBasedLanguages-datasource-layer-')
  );

  if (!attributes.state.adHocDataViews) {
    attributes.state.adHocDataViews = {};
  }

  for (const [layerId, layer] of textBasedLayerEntries) {
    const esqlQuery = layer.query?.esql;
    const oldIndex = layer.index;

    if (oldIndex && attributes.state.adHocDataViews[oldIndex]) {
      // Existing adHocDataView: remap to a deterministic ID
      const adHocDataView: DataViewSpec = attributes.state.adHocDataViews[oldIndex];
      // Use the same logic as the transform: derive timeField from the ES|QL query
      const timeFieldName = esqlQuery
        ? parseTimeFieldFromESQLQuery(esqlQuery)
        : adHocDataView.timeFieldName ?? layer.timeField ?? undefined;
      // The transform re-derives the index pattern (and the data view title/name) from the ES|QL
      // query, so a stale persisted name (e.g. a broader multi-index pattern) is normalized away.
      const indexPattern = esqlQuery
        ? getIndexPatternFromESQLQuery(esqlQuery)
        : adHocDataView.name ?? '';
      const newId = generateAdHocDataViewId({
        index: indexPattern,
        dataSourceType: 'esql',
        esqlQuery,
        timeFieldName,
      });

      layer.index = newId;
      adHocDataView.id = newId;
      adHocDataView.title = indexPattern;
      // An ES|QL ad-hoc data view has no dedicated `name` in the `{ type: 'esql', query }` data
      // source; the transform re-derives both title and name from the query's index pattern
      // (getAdHocDataViewSpec: `name = dataView.name ?? dataView.index`). This mirrors the DataView
      // runtime, where `getName() = name || title` and a freshly created ES|QL data view
      // (getESQLAdHocDataview) sets only `title = queryIndexPattern`, so the effective name is the
      // query index pattern.
      adHocDataView.name = adHocDataView.title;
      // The transform re-derives the time field from the ES|QL query rather than trusting the
      // persisted value (getAdHocDataViewSpec <- getDataSourceIndex.esql), so align the stored
      // timeFieldName here instead of skipping it entirely.
      adHocDataView.timeFieldName = timeFieldName;
      // Transform always sets type: 'esql' on ESQL adHocDataViews (via getAdHocDataViewSpec)
      adHocDataView.type = 'esql';
      attributes.state.adHocDataViews[newId] = adHocDataView;
      if (newId !== oldIndex) {
        delete attributes.state.adHocDataViews[oldIndex];
      }
    } else if (esqlQuery) {
      // No adHocDataView exists: create one from the ES|QL query (matches what the transform produces)
      const indexPattern = getIndexPatternFromESQLQuery(esqlQuery);
      const spec = getAdHocDataViewSpec({
        type: 'adHocDataView',
        index: indexPattern,
        dataSourceType: 'esql',
        esqlQuery,
        timeFieldName: parseTimeFieldFromESQLQuery(esqlQuery),
      });

      layer.index = spec.id;
      attributes.state.adHocDataViews[spec.id] = spec;
    }

    if (layer.index) {
      // Mutate the existing layer ref in place to keep references; fall back to pushing if no existing ref is found.
      // Keep the original layerId in the name so getCommonNormalizer can apply layerRemapping to it.
      const layerRefName = `indexpattern-datasource-layer-${layerId}`;
      const existingRef = refs.find((r) => r.name === layerRefName);
      if (existingRef) {
        existingRef.id = layer.index;
        // intentionally keep existingRef.name unchanged (still layerId)
      } else {
        refs.push({
          id: layer.index,
          name: layerRefName,
          type: 'index-pattern',
        });
      }
    }
  }

  return refs;
}

/**
 * Form-based ad-hoc data views: remap UUID-keyed entries to deterministic IDs
 * and update internal references to match.
 */
function normalizeFormBasedAdHocDataViews(
  attributes: LensAttributes,
  internalReferences: Reference[]
): Reference[] {
  const formBasedLayers = attributes.state.datasourceStates.formBased?.layers ?? {};
  const adHocDataViews = attributes.state.adHocDataViews ?? {};
  const refs = [...internalReferences];

  for (const [layerId, layer] of Object.entries(formBasedLayers)) {
    const layerRefName = `indexpattern-datasource-layer-${layerId}`;
    const ref = refs.find((r) => r.name === layerRefName);
    const adHocId = ref?.id ?? (layer as any).indexPatternId;

    if (adHocId && adHocDataViews[adHocId]) {
      const adHocDataView: DataViewSpec = adHocDataViews[adHocId];
      const newId = generateAdHocDataViewId({
        index: adHocDataView.title ?? '',
        timeFieldName: adHocDataView.timeFieldName,
      });

      delete adHocDataViews[adHocId];
      adHocDataView.id = newId;
      // A custom form-based name round-trips verbatim
      adHocDataViews[newId] = adHocDataView;
      // mirror the transform's `name = name ?? index` (title === index for form-based)
      adHocDataView.name = adHocDataView.name ?? adHocDataView.title;

      if (ref) {
        ref.id = newId;
        // Keep the original layerId in the name so getCommonNormalizer can apply layerRemapping to it.
      } else {
        refs.push({
          id: newId,
          name: `indexpattern-datasource-layer-${layerId}`,
          type: 'index-pattern',
        });
      }
    }
  }

  return refs;
}

/**
 * Remove ad-hoc data views not referenced by any layer or internal reference.
 */
function removeOrphanedAdHocDataViews(attributes: LensAttributes, internalReferences: Reference[]) {
  const referencedAdHocIds = new Set<string>();

  for (const layer of Object.values(attributes.state.datasourceStates.textBased?.layers ?? {})) {
    if (layer.index) {
      referencedAdHocIds.add(layer.index);
    }
  }

  for (const ref of internalReferences) {
    referencedAdHocIds.add(ref.id);
  }

  for (const id of Object.keys(attributes.state.adHocDataViews ?? {})) {
    if (!referencedAdHocIds.has(id)) {
      delete attributes.state.adHocDataViews![id];
    }
  }
}

/**
 * Switching between chart types in ES|QL mode leaves behind empty-column layers
 * from previously selected charts (Check https://github.com/elastic/kibana/issues/243084).
 * Only the active layer (in layerRemapping) survives the round-trip.
 */
function pruneEmptyColumnTextBasedLayers(attributes: LensAttributes) {
  const textBasedLayers = attributes.state.datasourceStates.textBased?.layers;
  if (!textBasedLayers) return;

  for (const [layerId, layer] of Object.entries(textBasedLayers)) {
    if (layer.columns.length === 0) {
      delete textBasedLayers[layerId];
    }
  }
}

/**
 * Normalize ad-hoc data view spec noise the SO -> API -> SO round-trip introduces.
 *
 * DROP verdicts — not carried by the embedded API, loss is accepted:
 * - `managed`: leaked saved-object metadata, never authored on a Lens ad-hoc data view and stripped from
 *   the public data-views API anyway.
 * - `allowNoIndex`: a field-fetch option (ES|`allow_no_indices`), not something authored on an
 *   ad-hoc data-view. The embedded API has no field for it and the transform always emits `false`, so a
 *   stored `true` (e.g. Fleet dashboards shipped before their indices exist) can't survive the
 *   round-trip. Coerce the original to `false` to match the transform.
 * - `allowHidden` on ES|QL DataViews: an ES|QL ad-hoc DataView serializes as an `{ type: 'esql', query }`
 *   datasource that carries no `allow_hidden_indices`, so the flag is dropped on that path. Strip
 *   it here. Form-based DataViews round-trip `allowHidden` faithfully and are compared directly.
 */
function normalizeAdHocDataViewSpec(dv: DataViewSpec) {
  delete dv.managed;
  dv.allowNoIndex = false;

  if (dv.type === 'esql' && dv.allowHidden === false) {
    delete dv.allowHidden;
  }

  if (Object.keys(dv.fieldAttrs ?? {}).length === 0) {
    delete dv.fieldAttrs;
  }
  if (Object.keys(dv.fieldFormats ?? {}).length === 0) {
    delete dv.fieldFormats;
  }
  if (Object.keys(dv.runtimeFieldMap ?? {}).length === 0) {
    delete dv.runtimeFieldMap;
  }
}

function normalizeAdHocDataViews(attributes: LensAttributes) {
  // Clear empty typeMeta objects
  for (const dv of Object.values(attributes.state.adHocDataViews ?? {})) {
    if (dv.typeMeta && Object.keys(dv.typeMeta).length === 0) {
      delete dv.typeMeta;
    }
  }

  let internalReferences = attributes.state.internalReferences ?? [];
  removeOrphanedAdHocDataViews(attributes, internalReferences);
  internalReferences = normalizeESQLAdHocDataViews(attributes, internalReferences);
  internalReferences = normalizeFormBasedAdHocDataViews(attributes, internalReferences);

  // Normalize spec noise last so it covers every ad-hoc data view (both the ES|QL and form-based paths
  // rebuild/remap specs above).
  for (const dv of Object.values(attributes.state.adHocDataViews ?? {})) {
    normalizeAdHocDataViewSpec(dv);
  }

  if (Object.keys(attributes.state.adHocDataViews ?? {}).length === 0) {
    delete attributes.state.adHocDataViews;
  }

  attributes.state.internalReferences = internalReferences;
  if (attributes.state.internalReferences.length === 0) {
    delete attributes.state.internalReferences;
  }
}

/**
 * For ES|QL panels, the layer query is the source of truth at runtime.
 * The top-level state.query may diverge in legacy SOs — sync it to the layer.
 */
function normalizeESQLQuery(attributes: LensAttributes) {
  const textBasedLayers = Object.values(attributes.state.datasourceStates.textBased?.layers ?? {});
  if (textBasedLayers.length > 0) {
    const layerQuery = textBasedLayers[0].query;
    // For ES|QL panels the layer query is authoritative; the transform always promotes it to the
    // top-level state query, replacing any stale legacy query (even a different language).
    if (layerQuery?.esql && attributes.state.query) {
      attributes.state.query = layerQuery;
    }
  }
}

/**
 * An empty query (query: "") is dropped during SO→API conversion, and the API→SO
 * step defaults to { language: 'kuery', query: '' }. Both are semantically identical.
 */
function normalizeEmptyQuery(attributes: LensAttributes) {
  const q = attributes.state.query;
  if (q && 'language' in q && typeof q.query === 'string' && q.query === '') {
    q.language = 'kuery';
  }
}

/**
 * description: null is equivalent to absent
 */
function normalizeDescription(attributes: LensAttributes) {
  if (attributes.description === null) {
    delete attributes.description;
  }
}

/**
 * dataType cannot always be preserved through transforms — it usually falls back to the
 * actual field type at runtime. These are the known remappings the transform applies.
 *
 * Some charts (e.g. datatable) can derive a more accurate dataType from extra context
 * (color config, etc.) and provide it via `inferred`. When supplied, it overrides the
 * generic fallback rules below; otherwise the default coercions are applied.
 */
function normalizeDataTypes(col: GenericIndexPatternColumn, inferred?: DataType) {
  if (inferred !== undefined) {
    col.dataType = inferred;
    return;
  }
  const { dataType, isBucketed, operationType } = col;
  if (operationType === 'terms' && dataType === 'number') {
    col.dataType = 'string';
  } else if (
    !isBucketed &&
    (dataType === 'date' || dataType === 'string' || dataType === 'ip' || dataType === 'boolean')
  ) {
    col.dataType = 'number';
  } else if (isBucketed && (dataType === 'ip' || dataType === 'boolean')) {
    col.dataType = 'string';
  }
}

const normalizeReferences = <T extends LensAttributes>(
  { references }: T,
  replacements: IdRemapping,
  filterRefNames: ReadonlySet<string> = new Set()
): Reference[] => {
  return orderBy(
    references
      .filter((reference) => {
        // Drop filter data-view references — they're inlined into `filter.meta.index` (re-extracted as
        // `filter-ref-<id>` on the transformed side). `filterRefNames` are the `meta.index` names
        // captured before `normalizeFilters` rewrote them (standard `filter-index-pattern-*` or custom
        // author names); the standard prefix is also matched directly for already-dropped filters.
        return !(
          reference.type === 'index-pattern' &&
          (filterRefNames.has(reference.name) || reference.name.startsWith('filter-index-pattern-'))
        );
      })
      // ignore current index pattern reference
      .filter((reference) => {
        return !(
          reference.type === 'index-pattern' &&
          reference.name === 'indexpattern-datasource-current-indexpattern'
        );
      })
      // textBasedLanguages-* references are replaced by indexpattern-datasource-layer-* in internalReferences
      .filter((reference) => {
        return !(
          reference.type === 'index-pattern' &&
          reference.name.startsWith('textBasedLanguages-datasource-layer-')
        );
      })
      // legacy bare-UUID-named references (pre-standardized naming), probably from dashboard reference extraction
      .filter((reference) => {
        return !(reference.type === 'index-pattern' && UUID_PATTERN.test(reference.name));
      })
      .map((reference) => {
        let name = reference.name;

        // replace all layer ids in reference name
        replacements.forEach(([oldId, newId]) => {
          if (oldId && name.includes(oldId)) {
            name = name.replace(oldId, newId);
          }
        });

        return {
          ...reference,
          name,
        };
      }),
    ['name', 'id', 'type'] // order is superfluous but ensures consistent comparison
  );
};

/**
 * Remap column references (e.g. counter_rate → max) using the column ID map.
 * Formula columns have their internal references cleared — they are not preserved through transforms.
 */
function normalizeColumnReferences(
  col: GenericIndexPatternColumn,
  columnIdMap: Map<string | undefined, string>
) {
  if (isReferenceBasedColumn(col)) {
    col.references = col.references.map((refId: string) => columnIdMap.get(refId) ?? refId);
  }

  if (col.operationType === 'formula') {
    (col as any).references = [];
  }
}

export interface CommonNormalizerArgs {
  layerRemapping: IdRemapping;
  columnRemapping: IdRemapping;
  /**
   * Optional per-chart dataType inference. When provided and returns a value,
   * it overrides the generic blanket coercions in `normalizeDataTypes`.
   */
  inferColumnDataType?: (newColumnId: string) => DataType | undefined;
}

// Stored filters carry `field`/ or deprecated `indexRefName` extensions that are absent from the base `FilterMeta`
type StoredFilterMeta = FilterMeta & { field?: string; indexRefName?: string };
type StoredFilter = Filter & { meta: StoredFilterMeta };

// Type guards used to narrow the deliberately-loose `@kbn/es-query` shapes (`query: Record<string, any>`,
// `meta.params: FilterMetaParams`) without any `as` casts.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasQueryValue = (value: unknown): value is { query: unknown } =>
  isRecord(value) && 'query' in value;

// Remove every top-level key except `meta`/`query` (e.g. legacy top-level `exists`/`range` that
// `migrateFilter` folds under `query` on a copy but leaves on the original object).
const stripExtraTopLevelKeys = (value: unknown, keep: readonly string[]): void => {
  if (!isRecord(value)) {
    return;
  }
  for (const key of Object.keys(value)) {
    if (!keep.includes(key)) {
      delete value[key];
    }
  }
};

// Delete every own key whose value is `null` (used for unbounded range bounds).
const dropNullValues = (value: unknown): void => {
  if (!isRecord(value)) {
    return;
  }
  for (const key of Object.keys(value)) {
    if (value[key] === null) {
      delete value[key];
    }
  }
};

/**
 * Canonicalize the ORIGINAL `state.filters` to match what the SO -> API -> SO transform emits, so the
 * strict roundtrip compare lines up. Every change is lossless: it either mirrors runtime
 * (`migrateFilter`/`mapFilter`) or drops a value runtime treats as absent.
 *
 * Returns the set of original `meta.index` reference names it consumed (captured before they are
 * rewritten to `filter-ref-<id>`), so the caller can drop the now-inlined filter reference entries from
 * `attributes.references`. Collecting and rewriting in a single pass keeps the two in lockstep.
 *
 * - `meta.index`: reference indirection only — the transform resolves the reference name to its data
 *   view id and rewrites it to `filter-ref-<id>` (`inject`/`extractFilterReferences`). Combined
 *   sub-filters inherit the parent's index (`to_stored_filter.ts` `cleanBase` has no per-condition one).
 * - Serialization defaults not reconstructed: `$state`, `negate: false`, top-level `alias: null`,
 *   sub-filter `alias`/`disabled` (`cleanBase`), and empty `query` objects.
 */
const normalizeFilters = (
  filters: StoredFilter[] | undefined,
  references: Reference[]
): Set<string> => {
  const filterRefNames = new Set<string>();
  if (!filters?.length) {
    return filterRefNames;
  }

  // Resolve a reference name to its data view id once (ad-hoc index strings are kept as-is), then
  // prefix `filter-ref-`, mirroring the transform's reference indirection.
  const refIdByName = new Map(references.map((reference) => [reference.name, reference.id]));
  const canonicalizeIndex = (index?: string): string | undefined => {
    if (index === undefined) return undefined;
    return `filter-ref-${refIdByName.get(index) ?? index}`;
  };

  // Canonicalize a leaf filter's query body to the transform's output. Lossless: value/field/data-view
  // identity is preserved.
  const canonicalizeQueryShape = (filter: StoredFilter): void => {
    // `migrateFilter` is what both runtime (`filterToQueryDsl`, `mapAndFlattenFilters`) and the transform
    // run: rewrite the deprecated `query.match.<f>: { query, type }` to `match_phrase`, and lift top-level
    // `exists`/`range`/`match_all` under `query`. Then keep only `{ meta, query }`.
    const migrated = migrateFilter(filter);
    filter.query = migrated.query;
    stripExtraTopLevelKeys(filter, ['meta', 'query']);

    // Collapse `match_phrase.<f>: { query }` to the scalar `buildPhraseFilter` shape, and drop the
    // redundant `meta.params.type` — `mapFilter`/`mapPhrase` does the same at render.
    const matchPhrase = isRecord(filter.query) ? filter.query.match_phrase : undefined;
    if (isRecord(matchPhrase)) {
      for (const field of Object.keys(matchPhrase) ?? []) {
        const value = matchPhrase[field];
        if (hasQueryValue(value)) {
          matchPhrase[field] = value.query;
        }
      }
    }
    if (filter.meta.type === 'phrase') {
      const params = filter.meta.params;
      if (isRecord(params) && 'type' in params) {
        delete params.type;
      }
    }

    // Drop `null` range bounds (query body + `meta.params`): a null bound is unbounded, i.e. absent.
    if (filter.meta.type === 'range') {
      const range = isRecord(filter.query) ? filter.query.range : undefined;
      if (isRecord(range)) {
        for (const field of Object.keys(range)) {
          dropNullValues(range[field]);
        }
      }
      dropNullValues(filter.meta.params);
    }
  };

  // Canonicalize one filter (and its combined descendants). `index` is the inherited data view id;
  // `isSubFilter` marks a combined sub-filter (loses more meta than a top-level filter).
  const processFilter = (
    filter: StoredFilter | string | number | boolean,
    index: string | undefined,
    isSubFilter: boolean
  ): void => {
    if (typeof filter !== 'object' || filter === null || !filter.meta) return;

    // Capture the original reference name before it is rewritten, so the caller can drop the matching
    // (now-inlined) `references` entry.
    if (filter.meta.index) {
      filterRefNames.add(filter.meta.index);
    }

    // Set the canonical/inherited index, or drop it when there is none.
    if (index === undefined) {
      delete filter.meta.index;
    } else {
      filter.meta.index = index;
    }

    // `$state` is UI-only and never reconstructed. NOTE: this only models `appState`. A `globalState`
    // (pinned) filter is dropped ENTIRELY by the transform (`from_stored_filter.ts` returns `undefined`),
    // which we do NOT reproduce — Lens panel filters are always `appState`, so the corpus has none. If
    // one appeared the lengths would differ and the test would fail loudly, which is the right outcome.
    delete filter.$state;
    // Drop any residual `meta.indexRefName`. The 8.1.0 migration already moved pre-8.1 `indexRefName`
    // into `meta.index` when the fixture was built; anything left is on a mis-versioned panel with no
    // `meta.index` — unresolvable by both runtime (`injectFilterReferences`) and the transform, so both
    // drop it.
    if ('indexRefName' in filter.meta) {
      delete filter.meta.indexRefName;
    }

    // `negate` is serialized only when `true`.
    if (filter.meta.negate !== true) {
      delete filter.meta.negate;
    }

    if (isSubFilter) {
      // Combined sub-filters carry neither `alias` nor `disabled` (`cleanBase`).
      delete filter.meta.alias;
      delete filter.meta.disabled;
    } else if (filter.meta.alias === null) {
      // A top-level `alias: null` is not representable; only a real label round-trips.
      delete filter.meta.alias;
    }

    // `meta.value` is display state recomputed by `mapFilter`; never persisted.
    delete filter.meta.value;

    // `wildcard` isn't in the `FILTERS` enum, so both runtime (`mapFilter` -> `mapDefault`) and the
    // transform relabel it to `custom`. Relabel so it flows through the `custom` branch below.
    if (filter.meta.type === 'wildcard') {
      filter.meta.type = 'custom';
    }

    // key/field alignment (`meta.field` is an extended stored-filter prop, see `StoredFilterMeta`).
    if (filter.meta.type === 'custom') {
      // Custom/DSL filters have no single field: `meta.key` is the `mapDefault` artifact (literal
      // "query"), dropped by the transform. Keep `meta.field` (scripted filters) so it round-trips.
      delete filter.meta.key;
    } else {
      // Structured filters carry the field in both `meta.key` and `meta.field` (always equal in the
      // corpus); align them.
      const fieldName = filter.meta.key ?? filter.meta.field;
      if (fieldName !== undefined) {
        filter.meta.key = fieldName;
        filter.meta.field = fieldName;
      }
    }

    // Query-shape canonicalization (leaf filters only; sub-filters recurse below and have no query body).
    if (filter.meta.type !== 'combined') {
      canonicalizeQueryShape(filter);
    }

    // Empty `query` objects are not emitted by the transform.
    if (Object.keys(filter.query ?? {}).length === 0) {
      delete filter.query;
    }

    // Recurse into combined sub-filters.
    if (filter.meta.type === 'combined' && Array.isArray(filter.meta.params)) {
      filter.meta.params.forEach((sub) => processFilter(sub, index, true));
    }
  };

  filters.forEach((filter) => processFilter(filter, canonicalizeIndex(filter.meta?.index), false));
  return filterRefNames;
};

export const getCommonNormalizer = <T extends LensAttributes>(
  getArgs: (attributes: T) => CommonNormalizerArgs
): NormalizerConfig<T> => ({
  order: -1,
  ignore: COMMON_STATE_IGNORE_PATHS,
  original: (attributes: T) => {
    const { layerRemapping, columnRemapping, inferColumnDataType } = getArgs(attributes);

    pruneEmptyColumnTextBasedLayers(attributes);
    normalizeAdHocDataViews(attributes);
    normalizeESQLQuery(attributes);
    normalizeEmptyQuery(attributes);
    normalizeDescription(attributes);

    // 'type' is a leaked SO envelope field, never part of LensAttributes and dropped by the transform
    // (fixed in https://github.com/elastic/kibana/pull/258250). Strip on the ORIGINAL side only so that
    // if the transform ever re-emits it, transformed still carries it and the strict compare fails.
    if ('type' in attributes && attributes.type === 'lens') {
      delete attributes.type;
    }

    // Canonicalize filters and collect (in a single pass) the reference names they consumed, so the
    // matching (now-inlined) filter reference entries can be dropped from `references` below.
    const filterRefNames = normalizeFilters(attributes.state.filters, attributes.references);

    // replace layer in reference name (filter references are dropped)
    attributes.references = normalizeReferences(attributes, layerRemapping, filterRefNames);

    // Remap internalReferences layer IDs using layerRemapping.
    // normalizeFormBasedAdHocDataViews / normalizeESQLAdHocDataViews now keep the original layer UUID
    // in the ref name so we can apply the same replacement logic here.
    if (attributes.state.internalReferences?.length) {
      attributes.state.internalReferences = attributes.state.internalReferences.map((ref) => {
        let name = ref.name;
        layerRemapping.forEach(([oldId, newId]) => {
          if (oldId && name.includes(oldId)) {
            name = name.replace(oldId, newId);
          }
        });
        return name !== ref.name ? { ...ref, name } : ref;
      });
    }

    const layerIdMap = new Map(layerRemapping);
    const columnIdMap = new Map(columnRemapping);

    function normalizeDatasourceState<S extends FormBasedPersistedState | TextBasedPersistedState>(
      dsState: S | undefined,
      fn: (ds: S) => S
    ): S | undefined {
      // remove empty datasource states
      if (!dsState || Object.keys(dsState.layers).length === 0) return;

      // prune erroneous columns and swap ids
      for (const [id, layer] of Object.entries(dsState.layers)) {
        // apply defaults
        layer.ignoreGlobalFilters =
          layer.ignoreGlobalFilters ?? LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE;

        if (layerIdMap.has(id)) {
          const newId = layerIdMap.get(id)!;
          // Avoid deleting the layer when the canonical id matches the current id
          if (newId !== id) {
            dsState.layers[newId] = layer;
            delete dsState.layers[id];
          }
        }
      }

      return fn(dsState);
    }

    attributes.state.datasourceStates = stripUndefined({
      textBased: normalizeDatasourceState(attributes.state.datasourceStates.textBased, (ds) => {
        for (const layer of Object.values(ds.layers)) {
          layer.columns = layer.columns.map((column) => {
            return {
              ...column,
              columnId: columnIdMap.get(column.columnId) ?? column.columnId,
            };
          });

          // Datatable's ESQL output order is driven by `layer.columns` array order
          // and uses its own canonical (rows → splits → metrics) sort in
          // the datatable normalizer. For every other chart, alphabetical
          // canonicalization is fine because column order does not drive
          // rendering.
          if (attributes.visualizationType !== 'lnsDatatable') {
            layer.columns.sort((a, b) => a.columnId.localeCompare(b.columnId));
          }

          if (layer.timeField) {
            layer.timeField = undefined; // not saved in API re-derived at runtime
          }
        }

        return ds;
      }),
      formBased: normalizeDatasourceState(
        getFormBasedDatasourceState(attributes.state.datasourceStates),
        (ds) => {
          for (const layer of Object.values(ds.layers)) {
            layer.columns = columnRemapping.reduce((columns, [oldColumn, newColumn]) => {
              if (oldColumn && layer.columns[oldColumn]) {
                columns[newColumn] = layer.columns[oldColumn];
              }

              return columns;
            }, {} as typeof layer.columns);

            layer.columnOrder = layer.columnOrder
              .filter((colId: string) => columnIdMap.has(colId))
              .map(
                (colId: string) =>
                  columnRemapping.find(([oldColumn]) => oldColumn === colId)?.[1] ?? colId
              );

            // Add canonical column IDs that are in layer.columns but were missing from the
            // original columnOrder (e.g. breakdown or inner-reference columns omitted in older SOs).
            // Maintain `inOrder` as entries are pushed to prevent duplicates when multiple original
            // column IDs share the same canonical name (e.g. two layers both mapped to 'line_breakdown').
            const inOrder = new Set(layer.columnOrder);
            for (const [, newCol] of columnRemapping) {
              if (newCol && layer.columns[newCol] && !inOrder.has(newCol)) {
                layer.columnOrder.push(newCol);
                inOrder.add(newCol);
              }
            }

            // Datatable uses its own canonical (rows → splits → metrics) sort in
            // the datatable normalizer. For every other chart, alphabetical
            // canonicalization is fine because column order does not drive
            // rendering.
            if (attributes.visualizationType !== 'lnsDatatable') {
              layer.columnOrder.sort();
            }

            // apply defaults
            layer.sampling = layer.sampling ?? LENS_SAMPLING_DEFAULT_VALUE;

            // remove empty incompleteColumns
            if (Object.keys(layer.incompleteColumns ?? {}).length === 0) {
              delete layer.incompleteColumns;
            }

            if (layer.linkToLayers) {
              layer.linkToLayers = layer.linkToLayers?.map((l) => layerIdMap.get(l) ?? l);
            }

            for (const [columnId, col] of Object.entries(layer.columns)) {
              // scale is not preserved through transforms
              delete col.scale;

              // Empty-string timeShift is semantically "no shift" and is dropped by the transform
              if (col.timeShift === '') {
                delete col.timeShift;
              }

              // remap inner column references (e.g. orderBy.columnId in terms columns)
              const orderByCol = (col as any).params?.orderBy?.columnId;
              if (orderByCol && columnIdMap.has(orderByCol)) {
                (col as any).params.orderBy.columnId = columnIdMap.get(orderByCol);
              }

              normalizeColumnReferences(col, columnIdMap);
              normalizeDataTypes(col, inferColumnDataType?.(columnId));
            }
          }
          return ds;
        }
      ),
    });

    attributes.state.needsRefresh = attributes.state.needsRefresh ?? false;
    attributes.version = LENS_ITEM_LATEST_VERSION; // transforms should return latest version

    return attributes;
  },
  transformed: (attributes: T) => {
    if (Object.keys(attributes.state.adHocDataViews ?? {}).length === 0) {
      delete attributes.state.adHocDataViews;
    }

    if (attributes.state.internalReferences?.length === 0) {
      delete attributes.state.internalReferences;
    }

    // remove as-code filter references
    attributes.references = attributes.references.filter((reference) => {
      return !(reference.type === 'index-pattern' && reference.name.startsWith('filter-ref-'));
    });

    // Sort references to match normalizeReferences ordering applied on the original side
    attributes.references = orderBy(attributes.references, ['name', 'id', 'type']);

    attributes.state.needsRefresh = attributes.state.needsRefresh ?? false;

    if (attributes.visualizationType !== 'lnsDatatable') {
      Object.values(attributes.state.datasourceStates.formBased?.layers ?? {}).forEach((layer) => {
        layer.columnOrder.sort();
      });
      Object.values(attributes.state.datasourceStates.textBased?.layers ?? {}).forEach((layer) => {
        layer.columns.sort((a, b) => a.columnId.localeCompare(b.columnId));
      });
    }

    return attributes;
  },
});

/**
 * A named (non-`custom`) palette renders from `palette id + continuity + steps` alone. The stored
 * stop positions, `colorStops`, and numeric bounds (`rangeMin`/`rangeMax`) are throwaway snapshots
 * that the transform does not reproduce (it emits empty `stops` and lets the palette service
 * resupply colors at render time). Drop those.
 *
 * `rangeType` is deliberately NOT dropped: it is deterministic per chart (`percent` everywhere
 * except `legacy_metric` and single-value `metric`, which reconstruct as `number` via
 * `useNumericRange`). Keeping it in the comparison enforces that each chart passes the correct
 * `useNumericRange`; the `original` side defaults a missing `rangeType` to `'percent'` so legacy
 * SOs that omit it still line up.
 */
function clearUnusedNamedPaletteParams(palette: PaletteOutput<CustomPaletteParams>) {
  if (!palette.params) return;
  delete palette.params.stops;
  delete palette.params.colorStops;
  delete palette.params.rangeMin;
  delete palette.params.rangeMax;
}

/**
 * Normalized the palette params provided a string path to the palette(s) in the attributes
 *
 * This need to address:
 * - named palettes: `palette id`, `continuity`, and `rangeType` are compared strictly (see
 *   `normalizeNamedPaletteParams`); the throwaway stops/colorStops/bounds are dropped.
 * - custom palettes: account for the last color stop always becoming `rangeMax`, re-derive
 *   `colorStops` from the normalized `stops`, and default the missing `rangeType`/`continuity`/bounds
 *   the transform always derives.
 */
export function getPaletteNormalizer<T extends LensAttributes>(
  palettePath: string,
  isSingleValuePalette?: (attributes: T) => boolean
): NormalizerConfig<T> {
  return {
    original: (attributes: T) => {
      const palettes = getValues<PaletteOutput<CustomPaletteParams>>(
        attributes,
        palettePath
      ).filter(Boolean);

      const useNumericRange =
        typeof isSingleValuePalette === 'function' ? isSingleValuePalette(attributes) : false;

      palettes.forEach((palette) => {
        if (!palette.params) return;

        const rangeMin = getRangeValue(palette.params.rangeMin);
        const rangeMax = getRangeValue(palette.params.rangeMax);

        if (palette.name !== 'custom') {
          // A distributed palette always opens both bounds so out-of-range values stay colored
          palette.params.continuity = 'all';

          // The transform canonicalizes the legacy `complimentary` spelling to the GA palette id
          // (`complementary`), matching runtime. Canonicalize the original side too so the
          // round-trip identity holds.
          const canonicalName =
            palette.name === LEGACY_COMPLIMENTARY_PALETTE ? COMPLEMENTARY_PALETTE : palette.name;
          palette.name = canonicalName;
          palette.params.name = canonicalName;
          palette.params.rangeType = useNumericRange ? 'number' : 'percent';
          clearUnusedNamedPaletteParams(palette);
          return;
        }

        // For multi-stop palettes: the SO→API transform uses rangeMax as the last step's upper
        // bound (lte), replacing the original stop value. The API→SO step then reconstructs the
        // stop from lte, so the last stop becomes rangeMax after the round-trip.
        //
        // For single stop palettes: the transform's `i === 0` branch emits a closed
        // `lt: <stop>` and returns before the last-step `lte: rangeMax` branch can run, so
        // `lte: rangeMax` is never applied to the stop. For an open-above single stop (continuity
        // 'above'/'all', rangeMax null) the transform instead appends a trailing `gte: <stop>`
        // continuation step, which `mergeTrailingSameColorStep` collapses back on the reverse pass,
        // leaving the original `lt` (the stop value) intact.
        if (palette.params.stops && palette.params.stops.length > 1) {
          const lastStop = palette.params.stops.at(-1);
          if (lastStop) lastStop.stop = rangeMax as unknown as number; // can be null
        }

        if (!palette.params.rangeType) {
          palette.params.rangeType = 'percent';
        }

        if (!palette.params.continuity) {
          palette.params.continuity = getContinuity(rangeMin, rangeMax);
        }

        // Legacy SOs may omit params.name, but the transform always sets it from the root name
        if (palette.params.name === undefined && palette.name) {
          palette.params.name = palette.name;
        }

        // Legacy SOs may omit rangeMin/rangeMax, but the transform always derives them (can be null)
        if (!('rangeMin' in palette.params)) {
          palette.params.rangeMin = null as unknown as number;
        }
        if (!('rangeMax' in palette.params)) {
          palette.params.rangeMax = null as unknown as number;
        }
      });

      return attributes;
    },
    ignore: [
      'maxSteps', // often omitted in original
      'progression', // deprecated but defaults to 'fixed'
      'reverse', // typically unused or omitted
      'steps', // count of steps in original is not right
    ].map((param) => `${palettePath}.params.${param}`),
  };
}

/**
 * Returns a normalizer that pre-applies the lossy state -> API collapse that
 * `fromRulesLensStateToAPI` performs on color-mapping rules.
 *
 * - `match` with `matchEntireWord: true` becomes a `raw` rule.
 * - `match` with `matchEntireWord: false`, `regex`, and `range` rules are
 *   runtime-dead (`getKey` returns `null`) and are stripped.
 */
export function getColorMappingNormalizer<T extends LensAttributes>(
  colorMappingPath: string
): NormalizerConfig<T> {
  return {
    original: (attributes: T) => {
      const configs = getValues<ColorMapping.Config>(attributes, colorMappingPath).filter(Boolean);

      configs.forEach((config) => {
        for (const assignment of config.assignments) {
          assignment.rules = assignment.rules.flatMap((rule): ColorMapping.ColorRule[] => {
            if (rule.type === 'raw') return [rule];
            if (rule.type === 'match' && rule.matchEntireWord === true) {
              const value = rule.matchCase ? rule.pattern : rule.pattern.toLowerCase();
              return [{ type: 'raw', value }];
            }
            return [];
          });
        }
      });

      return attributes;
    },
  };
}
