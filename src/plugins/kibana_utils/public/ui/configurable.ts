/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { UiComponent } from '../../common/ui/ui_component';
import { SerializableState } from '../../common';

/**
 * Represents something that can be configured by user using UI.
 */
export interface Configurable<
  Config extends SerializableState = SerializableState,
  Context = object
> {
  /**
   * Create default config for this item, used when item is created for the first time.
   */
  readonly createConfig: (context: Context) => Config;

  /**
   * Is this config valid. Used to validate user's input before saving.
   */
  readonly isConfigValid: (config: Config, context: Context) => boolean;

  /**
   * `UiComponent` to be rendered when collecting configuration for this item.
   */
  readonly CollectConfig: UiComponent<CollectConfigProps<Config, Context>>;
}

/**
 * Props provided to `CollectConfig` component on every re-render.
 */
export interface CollectConfigProps<
  Config extends SerializableState = SerializableState,
  Context = object
> {
  /**
   * Current (latest) config of the item.
   */
  config: Config;

  /**
   * Callback called when user updates the config in UI.
   */
  onConfig: (config: Config) => void;

  /**
   * Context information about where component is being rendered.
   */
  context: Context;
}
