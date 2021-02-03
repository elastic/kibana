/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
import { PullRequest } from './pr_api';

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
