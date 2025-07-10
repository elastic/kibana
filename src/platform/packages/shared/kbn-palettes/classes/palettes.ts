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
  #palettes: Map<string, IKbnPalette>;
  #aliasMappings: Map<string, string>;
  #defaultPalette: IKbnPalette;

  constructor(palettes: IKbnPalette[], defaultPalette: IKbnPalette) {
    this.#defaultPalette = defaultPalette;
    this.#palettes = new Map(palettes.map((p) => [p.id, p]));
    this.#aliasMappings = buildAliasMappings(palettes);
  }

  query = (id: string) => {
    const aliasedId = (this.#palettes.has(id) ? id : this.#aliasMappings.get(id)) ?? id;
    return this.#palettes.get(aliasedId);
  };

  get = (id: string) => {
    return this.query(id) ?? this.#defaultPalette;
  };

  getAll = () => {
    return [...this.#palettes.values()].filter(({ standalone }) => !standalone);
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
