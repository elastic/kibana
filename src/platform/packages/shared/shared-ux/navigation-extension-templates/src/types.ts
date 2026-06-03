/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Closed set of template ids the framework knows how to render. */
export type NavTemplateId = 'list';

/** A declarative action descriptor rendered by the `list` template. */
export interface NavTemplateActionConfig {
  id: string;
  label: string;
  icon?: string;
  /** When provided the action navigates directly; otherwise `onAction` is invoked. */
  href?: string;
}

/** Declarative config for the `link` template. */
export interface LinkTemplateConfig<Data = Record<string, string>> {
  /** Field on the data row to read the label from. Defaults to `label`. */
  labelField?: keyof Data;
  /** Field on the data row to read the href from. Defaults to `href`. */
  hrefField?: keyof Data;
}

/** Declarative config for the `list` template. */
export interface ListTemplateConfig<Data = Record<string, string>> {
  /** Field name mappings used to read each row's properties. */
  item: {
    idField: keyof Data;
    labelField: keyof Data;
    hrefField: keyof Data;
    iconField?: keyof Data;
    badgeField?: keyof Data;
  };
  /** Optional client-side search box. */
  search?: { enabled: boolean; placeholder?: string };
  /** Optional section-level actions. */
  actions?: NavTemplateActionConfig[];
  /** Message shown when the data source emits no rows. */
  emptyMessage?: string;
  /** Cap the number of rows rendered. */
  max?: number;
}

/** Union of all template configs. */
export type NavTemplateConfig<Data = Record<string, string>> = ListTemplateConfig<Data>;

export interface NavExtensionPointContext {
  /** Per-placement slot id designated in the navigation tree. */
  slotId: string;
  /** Id of the published extension definition filling the slot. */
  extensionId: string;
  /** Id of the active item in the slot. */
  activeItemId?: string;
}

/** Props every template receives from the framework. */
export interface NavListTemplateProps<Data = Record<string, string>> {
  /** Latest value emitted by the slot's `data$`. */
  data: Data[];
  /** Declarative variant config from the extension definition. */
  config: ListTemplateConfig<Data>;
  /** Rendering context (surface, active item, slot/extension ids). */
  context: NavExtensionPointContext;
  /**
   * Invoked for non-link actions. Link-style actions (with `href`) navigate
   * directly and do not call this.
   */
  onAction: (actionId: string, extensionId: string, itemData: Data) => void;
}

/**
 * Runtime-erased definition consumed by the framework renderer. Structurally compatible
 * with `NavExtensionDefinition<Id>` but with the id union widened to `string` so the
 * rendering plumbing does not depend on any publisher's augmentation being in scope.
 */
export interface NavExtensionRuntimeDefinition {
  id: string;
  templateId: NavTemplateId;
  config: NavTemplateConfig;
}

/** Runtime map of all registered extension definitions, keyed by extension id. */
export type NavExtensionDefinitionMap = Partial<Record<string, NavExtensionRuntimeDefinition>>;
