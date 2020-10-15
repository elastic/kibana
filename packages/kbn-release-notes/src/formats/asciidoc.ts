/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
