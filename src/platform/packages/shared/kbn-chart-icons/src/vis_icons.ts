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

/**
 * Icon to render for each persisted identifier in visualization saved objects (annotations, reference lines, metric, Graph).
 * Keys are Kibana-owned identifiers, not EUI icon names, so when EUI renames an icon only the value changes.
 * Don't remove keys, as older saved objects may still have it.
 */
export const VIS_ICONS = {
  // annotations, reference lines and metric
  empty: 'empty',
  alert: 'warning',
  asterisk: 'asterisk',
  bell: 'bell',
  bolt: 'bolt',
  bug: 'bug',
  editorComment: 'comment',
  flag: 'flag',
  heart: 'heart',
  mapMarker: 'waypoint',
  starEmpty: 'star',
  tag: 'tag',
  circle: IconCircle,
  pinFilled: 'pinFill',
  starFilled: 'starFill',
  triangle: IconTriangle,
  compute: 'processor',
  globe: 'globe',
  pin: 'pin',
  popout: 'external',
  sortDown: 'sortDown',
  sortUp: 'sortUp',
  temperature: 'thermometer',
  // TSVB
  warning: 'warning',
  // Graph icons
  at: 'at',
  display: 'display',
  document: 'document',
  folderOpen: 'folderOpen',
  home: 'home',
  key: 'key',
  kubernetesPod: 'cube',
  question: 'question',
  text: 'text',
  user: 'user',
  users: 'users',
  cluster: 'cluster',
  eye: 'eye',
  info: 'info',
  link: 'link',
  list: 'listBullet',
  search: 'magnify',
  visArea: 'chartArea',
  visBarVertical: 'chartBarVertical',
  visGauge: 'chartGauge',
  visLine: 'chartLine',
  visPie: 'chartPie',
  visTable: 'table',
} as const satisfies Record<string, VisIcon>;

export type VisIconType = keyof typeof VIS_ICONS;

export const isVisIconType = (iconId: string | undefined): iconId is VisIconType =>
  iconId !== undefined && Object.hasOwn(VIS_ICONS, iconId);

/**
 * Returns the icon to render for a persisted icon identifier. Unknown identifiers render the `empty` icon.
 */
export const resolveVisIcon = (iconId: string | undefined): VisIcon =>
  isVisIconType(iconId) ? VIS_ICONS[iconId] : 'empty';
