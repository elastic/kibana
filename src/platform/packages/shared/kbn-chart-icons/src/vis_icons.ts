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
 * Keys can be Kibana-owned identifiers, not EUI icon names, and `icon` is what gets rendered.
 * To rename an identifier, rename the key and move the old one into `aliases`.
 *
 * @TODO: some keys here still use legacy EUI names. This is to be rollback safe until all versions that may read the saved object
 * can resolve them. Once it is, rename those keys to their current names and move the old names into `aliases`.
 */
export const VIS_ICONS = {
  // annotations, reference lines and metric
  empty: { icon: 'empty' },
  alert: { icon: 'warning' },
  asterisk: { icon: 'asterisk' },
  bell: { icon: 'bell' },
  bolt: { icon: 'bolt' },
  bug: { icon: 'bug' },
  editorComment: { icon: 'comment' },
  flag: { icon: 'flag' },
  heart: { icon: 'heart' },
  mapMarker: { icon: 'waypoint' },
  starEmpty: { icon: 'star' },
  tag: { icon: 'tag' },
  circle: { icon: IconCircle },
  pinFilled: { icon: 'pinFill' },
  starFilled: { icon: 'starFill' },
  triangle: { icon: IconTriangle },
  compute: { icon: 'processor' },
  globe: { icon: 'globe' },
  pin: { icon: 'pin' },
  sortDown: { icon: 'sortDown' },
  sortUp: { icon: 'sortUp' },
  temperature: { icon: 'thermometer' },
  // TSVB
  warning: { icon: 'warning' },
  // Graph icons
  at: { icon: 'at' },
  display: { icon: 'display', aliases: ['desktop'] },
  document: { icon: 'document' },
  folderOpen: { icon: 'folderOpen' },
  home: { icon: 'home' },
  key: { icon: 'key' },
  kubernetesPod: { icon: 'cube' },
  question: { icon: 'question' },
  text: { icon: 'text', aliases: ['lettering'] },
  user: { icon: 'user' },
  users: { icon: 'users' },
  cluster: { icon: 'cluster' },
  eye: { icon: 'eye' },
  info: { icon: 'info' },
  link: { icon: 'link' },
  list: { icon: 'listBullet' },
  search: { icon: 'magnify' },
  visArea: { icon: 'chartArea' },
  visBarVertical: { icon: 'chartBarVertical' },
  visGauge: { icon: 'chartGauge' },
  visLine: { icon: 'chartLine' },
  visPie: { icon: 'chartPie' },
  visTable: { icon: 'table' },
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
