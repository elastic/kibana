/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { icon as apps } from '@elastic/eui/optimize/es/components/icon/assets/apps';
import { icon as at } from '@elastic/eui/optimize/es/components/icon/assets/at';
import { icon as boxesVertical } from '@elastic/eui/optimize/es/components/icon/assets/boxes_vertical';
import { icon as branch } from '@elastic/eui/optimize/es/components/icon/assets/branch';
import { icon as checkCircleFill } from '@elastic/eui/optimize/es/components/icon/assets/check_circle_fill';
import { icon as chevronSingleDown } from '@elastic/eui/optimize/es/components/icon/assets/chevron_single_down';
import { icon as chevronSingleLeft } from '@elastic/eui/optimize/es/components/icon/assets/chevron_single_left';
import { icon as chevronSingleRight } from '@elastic/eui/optimize/es/components/icon/assets/chevron_single_right';
import { icon as code } from '@elastic/eui/optimize/es/components/icon/assets/code';
import { icon as copy } from '@elastic/eui/optimize/es/components/icon/assets/copy';
import { icon as cross } from '@elastic/eui/optimize/es/components/icon/assets/cross';
import { icon as ellipsis } from '@elastic/eui/optimize/es/components/icon/assets/ellipsis';
import { icon as info } from '@elastic/eui/optimize/es/components/icon/assets/info';
import { icon as minus } from '@elastic/eui/optimize/es/components/icon/assets/minus';
import { icon as pencil } from '@elastic/eui/optimize/es/components/icon/assets/pencil';
import { icon as play } from '@elastic/eui/optimize/es/components/icon/assets/play';
import { icon as plus } from '@elastic/eui/optimize/es/components/icon/assets/plus';
import { icon as plusCircle } from '@elastic/eui/optimize/es/components/icon/assets/plus_circle';
import { icon as question } from '@elastic/eui/optimize/es/components/icon/assets/question';
import { icon as refresh } from '@elastic/eui/optimize/es/components/icon/assets/refresh';
import { icon as share } from '@elastic/eui/optimize/es/components/icon/assets/share';
import { icon as tokenArray } from '@elastic/eui/optimize/es/components/icon/assets/token_array';
import { icon as tokenBoolean } from '@elastic/eui/optimize/es/components/icon/assets/token_boolean';
import { icon as tokenDate } from '@elastic/eui/optimize/es/components/icon/assets/token_date';
import { icon as tokenNull } from '@elastic/eui/optimize/es/components/icon/assets/token_null';
import { icon as tokenNumber } from '@elastic/eui/optimize/es/components/icon/assets/token_number';
import { icon as tokenObject } from '@elastic/eui/optimize/es/components/icon/assets/token_object';
import { icon as tokenString } from '@elastic/eui/optimize/es/components/icon/assets/token_string';
import { icon as trash } from '@elastic/eui/optimize/es/components/icon/assets/trash';
import { icon as warning } from '@elastic/eui/optimize/es/components/icon/assets/warning';
import { icon as workflow } from '@elastic/eui/optimize/es/components/icon/assets/workflow';
import { appendIconComponentCache } from '@elastic/eui/optimize/es/components/icon/icon';
import type { ReactElement, SVGProps } from 'react';

/**
 * Every EUI glyph the visual builder draws, in one module.
 *
 * Only ever reached through `import('./eui_icon_set')` (see `ensure_eui_icons.ts` and
 * `type_icon_masks.ts`), so the bundler emits ONE lazy chunk for all of them instead of one tiny
 * chunk per glyph, and Jest, which cannot parse the `optimize/es` ESM graph, never loads it.
 * Keep the glyph imports here: a second module importing an icon asset would bring the
 * one-request-per-icon fan-out back (visible as extra tiny chunks in a production build).
 */
type EuiIconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

export type EuiIconKey =
  | 'apps'
  | 'at'
  | 'boxesVertical'
  | 'branch'
  | 'checkCircleFill'
  | 'chevronSingleDown'
  | 'chevronSingleLeft'
  | 'chevronSingleRight'
  | 'code'
  | 'copy'
  | 'cross'
  | 'ellipsis'
  | 'info'
  | 'minus'
  | 'pencil'
  | 'play'
  | 'plus'
  | 'plusCircle'
  | 'question'
  | 'refresh'
  | 'share'
  | 'tokenArray'
  | 'tokenBoolean'
  | 'tokenDate'
  | 'tokenNull'
  | 'tokenNumber'
  | 'tokenObject'
  | 'tokenString'
  | 'trash'
  | 'warning'
  | 'workflow';

export const euiIconComponents: Readonly<Record<EuiIconKey, EuiIconComponent>> = {
  apps,
  at,
  boxesVertical,
  branch,
  checkCircleFill,
  chevronSingleDown,
  chevronSingleLeft,
  chevronSingleRight,
  code,
  copy,
  cross,
  ellipsis,
  info,
  minus,
  pencil,
  play,
  plus,
  plusCircle,
  question,
  refresh,
  share,
  // FieldIcon glyphs used by the data-reference catalog / field editor.
  tokenArray,
  tokenBoolean,
  tokenDate,
  tokenNull,
  tokenNumber,
  tokenObject,
  tokenString,
  trash,
  warning,
  workflow,
};

/** Seeds the cache the aliased `@elastic/eui` package reads, so these glyphs render synchronously. */
export const seedEuiIcons = (): void => {
  appendIconComponentCache(euiIconComponents);
};
