/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type HotkeyDefinition } from '@kbn/core-hotkeys-browser';

/**
 * Optional metadata for Monaco `addCommand` discovery rows (cheat sheet).
 * Align fields with {@link HotkeyDefinition} from `@kbn/core-hotkeys-browser` except `keys`,
 * which are derived from the Monaco keybinding by the Code Editor wrapper.
 *
 * @public
 */
export type MonacoHotkeyDiscoveryMeta = Pick<
  HotkeyDefinition,
  'id' | 'label' | 'description' | 'scope' | 'appId' | 'featureId' | 'group' | 'enabled' | 'keys'
>;
