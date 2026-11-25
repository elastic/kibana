/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IconCircle, IconTriangle } from './assets';
import { resolveVisIcon, isVisIconType } from './vis_icons';

const UNKNOWN_ICON_IDS = [undefined, '', 'notAnIcon', 'https://example.com/icon.svg', 'toString'];

describe('resolveVisIcon', () => {
  it.each([
    ['mapMarker', 'waypoint'],
    ['kubernetesPod', 'cube'],
    ['popout', 'external'],
    ['visLine', 'chartLine'],
  ])('resolves the identifier "%s" to the EUI icon "%s"', (iconId, expected) => {
    expect(resolveVisIcon(iconId)).toBe(expected);
  });

  it.each(['asterisk', 'bell', 'empty', 'globe', 'info', 'pin', 'sortUp', 'warning'])(
    'resolves the identifier "%s" to the EUI icon of the same name',
    (iconId) => {
      expect(resolveVisIcon(iconId)).toBe(iconId);
    }
  );

  it('resolves Kibana-owned identifiers to their icon components', () => {
    expect(resolveVisIcon('circle')).toBe(IconCircle);
    expect(resolveVisIcon('triangle')).toBe(IconTriangle);
  });

  it.each(UNKNOWN_ICON_IDS)('resolves the unknown identifier %p to the "empty" icon', (iconId) => {
    expect(resolveVisIcon(iconId)).toBe('empty');
  });
});

describe('isVisIconType', () => {
  it.each(['empty', 'mapMarker', 'display', 'circle'])('recognizes "%s"', (iconId) => {
    expect(isVisIconType(iconId)).toBe(true);
  });

  it.each(UNKNOWN_ICON_IDS)('does not recognize %p', (iconId) => {
    expect(isVisIconType(iconId)).toBe(false);
  });
});
