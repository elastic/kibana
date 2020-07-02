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

import { ToolingLog } from '@kbn/dev-utils';

import {
  Area,
  AREAS,
  UNKNOWN_AREA,
  AsciidocSection,
  ASCIIDOC_SECTIONS,
  UNKNOWN_ASCIIDOC_SECTION,
} from '../release_notes_config';
import { PullRequest } from './pull_request';

export interface ClassifiedPr extends PullRequest {
  area: Area;
  asciidocSection: AsciidocSection;
}

export function classifyPr(pr: PullRequest, log: ToolingLog): ClassifiedPr {
  const filter = (a: Area | AsciidocSection) =>
    a.labels.some((test) =>
      typeof test === 'string' ? pr.labels.includes(test) : pr.labels.some((l) => l.match(test))
    );

  const areas = AREAS.filter(filter);
  const asciidocSections = ASCIIDOC_SECTIONS.filter(filter);

  const pickOne = <T extends Area | AsciidocSection>(name: string, options: T[]) => {
    if (options.length > 1) {
      const matches = options.map((o) => o.title).join(', ');
      log.warning(`[${pr.terminalLink}] ambiguous ${name}, mulitple match [${matches}]`);
      return options[0];
    }

    if (options.length === 0) {
      log.error(`[${pr.terminalLink}] unable to determine ${name} because none match`);
      return;
    }

    return options[0];
  };

  return {
    ...pr,
    area: pickOne('area', areas) || UNKNOWN_AREA,
    asciidocSection: pickOne('asciidoc section', asciidocSections) || UNKNOWN_ASCIIDOC_SECTION,
  };
}
