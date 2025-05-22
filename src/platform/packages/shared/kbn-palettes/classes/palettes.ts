/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IKbnPalette } from './types';

export class KbnPalettes {
  private _palettes: Map<string, IKbnPalette>;
  private _aliasMappings: Map<string, string>;
  private _defaultPalette: IKbnPalette;

  constructor(palettes: IKbnPalette[], defaultPalette: IKbnPalette) {
    this._defaultPalette = defaultPalette;
    this._palettes = new Map(palettes.map((p) => [p.id, p]));
    this._aliasMappings = buildAliasMappings(palettes);
  }

  query = (id: string) => {
    const aliasedId = (this._palettes.has(id) ? id : this._aliasMappings.get(id)) ?? id;
    return this._palettes.get(aliasedId);
  };

  get = (id: string) => {
    return this.query(id) ?? this._defaultPalette;
  };

  getAll = () => {
    return Array.from(this._palettes.values()).filter(({ standalone }) => !standalone);
  };
}

function buildAliasMappings(palettes: IKbnPalette[]): Map<string, string> {
  return palettes.reduce((acc, { id, aliases }) => {
    aliases.forEach((alias) => {
      if (!acc.has(alias)) acc.set(alias, id);
    });
    return acc;
  }, new Map());
}
