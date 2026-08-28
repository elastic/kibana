/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import type { ReactNode } from 'react';
import { FlyoutSection } from '@kbn/flyout-sections';
import { bodyAssembly, sectionAssembly } from '../../assembly';
import type { FlyoutBodySectionProps } from '../../types';
import { subsectionPart, SUBSECTION_PART_NAME } from '../subsection/part';

/** Part name used for identifying `Body.Section` children. */
export const SECTION_PART_NAME = 'section';

/** Part factory for `FlyoutTemplate.Body.Section`. */
export const sectionPart = bodyAssembly.definePart<Record<string, never>, ReactNode, void>({
  name: SECTION_PART_NAME,
});

/** Declarative `FlyoutTemplate.Body.Section`. */
export const Section = sectionPart.createComponent<FlyoutBodySectionProps>({
  resolve: ({
    title,
    icon,
    tooltip,
    action,
    hasBorder: authored,
    children,
    'data-test-subj': dataTestSubj,
  }) => {
    const items = sectionAssembly.parseChildren(children, { supportsOtherChildren: true });
    const hasSubsections = items.some((i) => i.type === 'part' && i.part === SUBSECTION_PART_NAME);

    if (!hasSubsections) {
      return (
        <FlyoutSection
          title={title}
          icon={icon}
          tooltip={tooltip}
          action={action}
          hasBorder={authored}
          data-test-subj={dataTestSubj}
        >
          {children}
        </FlyoutSection>
      );
    }

    // Subsections present: the border lands on each subsection; outer section must not also have one.
    return (
      <FlyoutSection
        title={title}
        icon={icon}
        tooltip={tooltip}
        action={action}
        hasBorder={false}
        data-test-subj={dataTestSubj}
      >
        {items.map((item, index) => {
          if (item.type === 'child') {
            return <Fragment key={`passthrough-${index}`}>{item.node}</Fragment>;
          }
          return (
            <Fragment key={item.instanceId}>
              {subsectionPart.resolve(item, { hasBorder: authored ?? false }) ?? null}
            </Fragment>
          );
        })}
      </FlyoutSection>
    );
  },
});

Section.displayName = 'FlyoutTemplate.Body.Section';
