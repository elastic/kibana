/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { IconCircle, IconTriangle } from './assets';

export type VisIcon = EuiIconType | typeof IconCircle | typeof IconTriangle;

interface VisIconDefinition {
  readonly icon: VisIcon;
  /**
   * Identifiers written by older versions, as saved objects may still have them. Only additive, never remove one.
   */
  readonly aliases?: readonly string[];
}

/**
 * Icons available to visualization editors, keyed by the identifier persisted in saved objects.
 * To rename an identifier, rename the key and move the old one into `aliases`.
 */
export const VIS_ICONS = {
  asterisk: { icon: 'asterisk' },
  at: { icon: 'at' },
  bell: { icon: 'bell' },
  bolt: { icon: 'bolt' },
  bug: { icon: 'bug' },
  chartArea: { icon: 'chartArea', aliases: ['visArea'] },
  chartBarVertical: { icon: 'chartBarVertical', aliases: ['visBarVertical'] },
  chartGauge: { icon: 'chartGauge', aliases: ['visGauge'] },
  chartLine: { icon: 'chartLine', aliases: ['visLine'] },
  chartPie: { icon: 'chartPie', aliases: ['visPie'] },
  circle: { icon: IconCircle },
  cluster: { icon: 'cluster' },
  comment: { icon: 'comment', aliases: ['editorComment'] },
  cube: { icon: 'cube', aliases: ['kubernetesPod'] },
  display: { icon: 'display' },
  document: { icon: 'document' },
  empty: { icon: 'empty' },
  eye: { icon: 'eye' },
  flag: { icon: 'flag' },
  folderOpen: { icon: 'folderOpen' },
  globe: { icon: 'globe' },
  heart: { icon: 'heart' },
  home: { icon: 'home' },
  info: { icon: 'info' },
  key: { icon: 'key' },
  link: { icon: 'link' },
  listBullet: { icon: 'listBullet', aliases: ['list'] },
  magnify: { icon: 'magnify', aliases: ['search'] },
  pin: { icon: 'pin' },
  pinFill: { icon: 'pinFill', aliases: ['pinFilled'] },
  processor: { icon: 'processor', aliases: ['compute'] },
  question: { icon: 'question' },
  sortDown: { icon: 'sortDown' },
  sortUp: { icon: 'sortUp' },
  star: { icon: 'star', aliases: ['starEmpty'] },
  starFill: { icon: 'starFill', aliases: ['starFilled'] },
  table: { icon: 'table', aliases: ['visTable'] },
  tag: { icon: 'tag' },
  text: { icon: 'text' },
  thermometer: { icon: 'thermometer', aliases: ['temperature'] },
  triangle: { icon: IconTriangle },
  user: { icon: 'user' },
  users: { icon: 'users' },
  warning: { icon: 'warning', aliases: ['alert'] },
  waypoint: { icon: 'waypoint', aliases: ['mapMarker'] },
} as const satisfies Record<string, VisIconDefinition>;

export type VisIconType = keyof typeof VIS_ICONS;

const VIS_ICON_BY_ALIAS = new Map(
  (Object.entries(VIS_ICONS) as Array<[VisIconType, VisIconDefinition]>).flatMap(
    ([id, { icon, aliases = [] }]) =>
      [id, ...aliases].map((alias) => [alias, { id, icon }] as const)
  )
);

/**
 * Resolves a persisted icon identifier, including legacy aliases, to its current identifier and the
 * icon to render. Unknown identifiers resolve to the `empty` icon without an identifier.
 */
export const resolveVisIcon = (
  iconId: string | undefined
): {
  id: VisIconType | undefined;
  icon: VisIcon;
} => {
  const visIcon = iconId ? VIS_ICON_BY_ALIAS.get(iconId) : undefined;

  if (!visIcon) {
    return { id: undefined, icon: 'empty' };
  }
  return visIcon;
};

export type ResolvedVisIcon = ReturnType<typeof resolveVisIcon>;
