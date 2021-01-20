/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import dedent from 'dedent';

import { Format } from './format';
import {
  ASCIIDOC_SECTIONS,
  UNKNOWN_ASCIIDOC_SECTION,
  AREAS,
  UNKNOWN_AREA,
} from '../release_notes_config';

function* lines(body: string) {
  for (const line of dedent(body).split('\n')) {
    yield `${line}\n`;
  }
}

export class AsciidocFormat extends Format {
  static extension = 'asciidoc';

  *print() {
    const sortedAreas = [
      ...AREAS.slice().sort((a, b) => a.title.localeCompare(b.title)),
      UNKNOWN_AREA,
    ];

    yield* lines(`
      [[release-notes-${this.version.label}]]
      == ${this.version.label} Release Notes

      Also see <<breaking-changes-${this.version.major}.${this.version.minor}>>.
    `);

    for (const section of [...ASCIIDOC_SECTIONS, UNKNOWN_ASCIIDOC_SECTION]) {
      const prsInSection = this.prs.filter((pr) => pr.asciidocSection === section);
      if (!prsInSection.length) {
        continue;
      }

      yield '\n';
      yield* lines(`
        [float]
        [[${section.id}-${this.version.label}]]
        === ${section.title}
      `);

      for (const area of sortedAreas) {
        const prsInArea = prsInSection.filter((pr) => pr.area === area);

        if (!prsInArea.length) {
          continue;
        }

        yield `${area.title}::\n`;
        for (const pr of prsInArea) {
          const fixes = pr.fixes.length ? `[Fixes ${pr.fixes.join(', ')}] ` : '';
          const strippedTitle = pr.title.replace(/^\s*\[[^\]]+\]\s*/, '');
          yield `* ${fixes}${strippedTitle} {kibana-pull}${pr.number}[#${pr.number}]\n`;
          if (pr.note) {
            yield `  - ${pr.note}\n`;
          }
        }
      }
    }
  }
}
