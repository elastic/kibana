/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { borealis, SURFACES, type Mode } from '../borealis';
import snapshot from '../test/check_palettes.snap.json';
import { DEFAULT_PARAMS, ROLES, type Hex, type Role } from '.';

type Snapshot = Record<Mode, { surface: Hex; hues: Record<string, Record<Role, { hex: Hex }>> }>;

const MODES: Mode[] = ['light', 'dark'];

describe.each(MODES)('borealis on %s', (mode) => {
  const { surface, hues } = (snapshot as Snapshot)[mode];
  const { roles } = borealis.palettes(surface, DEFAULT_PARAMS);

  it('uses the same surface as the workbench', () => {
    expect(SURFACES[mode]).toBe(surface);
  });

  it('has the same hues as the workbench', () => {
    expect(roles.map(({ name }) => name)).toEqual(Object.keys(hues));
  });

  it.each(Object.keys(hues))('matches the workbench role colors for %s', (name) => {
    const role = roles.find((r) => r.name === name)!;
    const expected = Object.fromEntries(ROLES.map((k) => [k, hues[name][k].hex]));
    const actual = Object.fromEntries(ROLES.map((k) => [k, role[k]]));
    expect(actual).toEqual(expected);
  });

  it('rolesAt matches palettes for every theme hue', () => {
    for (const role of roles) {
      const at = borealis.rolesAt(role.angle, surface, DEFAULT_PARAMS);
      expect(at).toEqual(Object.fromEntries(ROLES.map((k) => [k, role[k]])));
    }
  });
});
