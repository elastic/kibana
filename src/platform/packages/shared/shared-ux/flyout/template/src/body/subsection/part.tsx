/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { FlyoutSubsection } from '@kbn/flyout-sections';
import { sectionAssembly } from '../../assembly';
import type { FlyoutBodySubsectionProps } from '../../types';

/** Part name used for identifying `Body.Section.Subsection` children. */
export const SUBSECTION_PART_NAME = 'subsection';

/** Runtime context passed to the subsection resolver by the section/accordion adapter. */
export interface SubsectionResolveContext {
  /** Whether the parent section uses bordered boxes. */
  hasBorder: boolean;
}

/** Part factory for `FlyoutTemplate.Body.Section.Subsection`. */
export const subsectionPart = sectionAssembly.definePart<
  Record<string, never>,
  ReactNode,
  SubsectionResolveContext
>({ name: SUBSECTION_PART_NAME });

/** Declarative body subsection, exposed through Section and Accordion. */
export const Subsection = subsectionPart.createComponent<FlyoutBodySubsectionProps>({
  resolve: ({ title, children, 'data-test-subj': dataTestSubj }, { hasBorder }) => (
    <FlyoutSubsection title={title} hasBorder={hasBorder} data-test-subj={dataTestSubj}>
      {children}
    </FlyoutSubsection>
  ),
});

Subsection.displayName = 'FlyoutTemplate.Body.Section.Subsection';
