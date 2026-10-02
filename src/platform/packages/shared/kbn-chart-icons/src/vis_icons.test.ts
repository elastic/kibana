/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IconCircle, IconTriangle } from './assets';
import { resolveVisIcon, VIS_ICONS } from './vis_icons';

const LEGACY_ALIASES = [
  ['alert', 'warning'],
  ['compute', 'processor'],
  ['editorComment', 'comment'],
  ['kubernetesPod', 'cube'],
  ['list', 'listBullet'],
  ['mapMarker', 'waypoint'],
  ['pinFilled', 'pinFill'],
  ['search', 'magnify'],
  ['starEmpty', 'star'],
  ['starFilled', 'starFill'],
  ['temperature', 'thermometer'],
  ['visArea', 'chartArea'],
  ['visBarVertical', 'chartBarVertical'],
  ['visGauge', 'chartGauge'],
  ['visLine', 'chartLine'],
  ['visPie', 'chartPie'],
  ['visTable', 'table'],
] as const;

describe('resolveVisIcon', () => {
  it.each(LEGACY_ALIASES)(
    'resolves the legacy identifier "%s" to the current identifier and EUI icon "%s"',
    (alias, expected) => {
      expect(resolveVisIcon(alias)).toEqual({ id: expected, icon: expected });
    }
  );

  it.each(['asterisk', 'bell', 'comment', 'empty', 'globe', 'pin', 'sortUp', 'warning'])(
    'resolves the identifier "%s" to itself and the EUI icon of the same name',
    (iconId) => {
      expect(resolveVisIcon(iconId)).toEqual({ id: iconId, icon: iconId });
    }
  );

  it('resolves Kibana-owned identifiers to their icon components', () => {
    expect(resolveVisIcon('circle')).toEqual({ id: 'circle', icon: IconCircle });
    expect(resolveVisIcon('triangle')).toEqual({ id: 'triangle', icon: IconTriangle });
  });

  it.each([
    undefined,
    '',
    'notAnIcon',
    'fa-star',
    'constructor',
    'toString',
    'https://example.com/icon.svg',
  ])('resolves the unknown identifier %p to the "empty" icon without an identifier', (iconId) => {
    expect(resolveVisIcon(iconId)).toEqual({ id: undefined, icon: 'empty' });
  });
});

describe('icon definitions', () => {
  const definitions = Object.values(VIS_ICONS);
  const iconIds = Object.keys(VIS_ICONS);
  const aliases = definitions.flatMap((definition) =>
    'aliases' in definition ? definition.aliases : []
  );

  it('uses each alias only once', () => {
    expect(new Set(aliases).size).toBe(aliases.length);
  });

  it('never uses a current identifier as an alias', () => {
    expect(aliases.filter((alias) => iconIds.some((iconId) => iconId === alias))).toEqual([]);
  });
});
