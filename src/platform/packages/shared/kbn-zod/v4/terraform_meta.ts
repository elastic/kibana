/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Terraform variant-mapping metadata for `.meta()`, e.g. `.meta({ description, ...tfUnion({ merge: true }) })`.
// The keys are emitted unchanged into Kibana's published OpenAPI file (`z.toJSONSchema()` copies every `.meta()` key
// and the bundler keeps `x-` keys). Always go through these helpers: `.meta()` accepts any key, so a hand-written
// `'x-tf-…'` key would compile even when misspelled, while a misspelled helper or option does not.

/** Maps one union to Terraform variant keys. */
export interface TfUnionMeta {
  /** Property whose literal value identifies the variant (with or without an OAS discriminator). */
  discriminator?: string;
  /** Value to assume when the discriminator property is absent (Zod preprocess defaults). */
  default_value?: string;
  /** Variant key naming convention; `{value}` is the discriminator value. Default `{value}`. */
  key_template?: string;
  /** Exceptions to `key_template`, by discriminator value. */
  variant_keys?: Readonly<Record<string, string>>;
  /** `drop` (default): the discriminator is not a Terraform attribute. `outside`: kept beside the variant keys. */
  discriminator_placement?: 'drop' | 'outside';
  /** The variant body is this property of the branch; the branch's other properties stay beside the variant keys. */
  content?: string;
  /** Mutual-exclusion validator emitted over the variant keys. Default `exactly_one_of`. */
  exclusivity?: 'exactly_one_of' | 'conflicts_with';
  /** An extra JSON-string variant key allowed for the listed discriminator values. */
  extra_json_variant?: { key: string; values: readonly string[] };
  /** No discriminator: each branch carries `tfVariant({ match })`; first match wins. */
  structural?: true;
  /** No variant keys: all branches are merged into one object. */
  merge?: true;
  /** Property paths (`a`, `a[]`, `a[].b`) of the merged object that become JSON-string attributes. */
  json_leaves?: Readonly<Record<string, string>>;
}

/** Per-branch settings of a union. */
export interface TfVariantMeta {
  key?: string;
  match?: { present: string } | { absent: string };
  omit?: true;
  keep_discriminator?: true;
  json_leaves?: Readonly<Record<string, string>>;
}

/** Maps the union this meta is attached to. */
export const tfUnion = (meta: TfUnionMeta): { 'x-tf-union': TfUnionMeta } => ({
  'x-tf-union': meta,
});

/** Use-site override, merged over the mapping of the union this array or optional wraps. */
export const tfUnionOverride = (
  meta: Partial<TfUnionMeta>
): { 'x-tf-union-override': Partial<TfUnionMeta> } => ({ 'x-tf-union-override': meta });

/** Settings of one union branch. */
export const tfVariant = (meta: TfVariantMeta): { 'x-tf-variant': TfVariantMeta } => ({
  'x-tf-variant': meta,
});

/** Property `p` becomes JSON-string `p_json`; with `attribute`, the value becomes `{ [attribute]: json }`. */
export const tfJsonLeaf = (
  attribute?: string
): { 'x-tf-json-leaf': true | { attribute: string } } => ({
  'x-tf-json-leaf': attribute === undefined ? true : { attribute },
});

/** Hoists this object's properties into the parent Terraform object. */
export const tfFlatten = (): { 'x-tf-flatten': true } => ({ 'x-tf-flatten': true });

/** On an object with one required property: the Terraform attribute holds that property's value, not the object. */
export const tfUnwrap = (): { 'x-tf-unwrap': true } => ({ 'x-tf-unwrap': true });

/** A string (or each string of a list) that is the ID of a resource of another Terraform resource type. */
export interface TfRefMeta {
  /** The Terraform resource type the ID belongs to, e.g. `elasticstack_kibana_tag`. */
  resource_type: string;
  /** The attribute of that resource holding the ID, e.g. `tag_id`. */
  id_attribute: string;
}

/** Marks a string, or a list of strings, as IDs of resources the export can write and reference. */
export const tfRef = (meta: TfRefMeta): { 'x-tf-ref': TfRefMeta } => ({ 'x-tf-ref': meta });

/** Marks a string as the ID of a data view; the schemas that hold one share this so they cannot disagree. */
export const tfDataViewRef = (): { 'x-tf-ref': TfRefMeta } =>
  tfRef({ resource_type: 'elasticstack_kibana_data_view', id_attribute: 'data_view.id' });

/** API-only; not a Terraform attribute. */
export const tfOmit = (): { 'x-tf-omit': true } => ({ 'x-tf-omit': true });
