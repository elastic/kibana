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
import { FlyoutAccordion } from '@kbn/flyout-sections';
import { bodyAssembly, sectionAssembly } from '../../assembly';
import type { FlyoutBodyAccordionProps } from '../../types';
import { subsectionPart, SUBSECTION_PART_NAME } from '../subsection/part';

/** Part name used for identifying `Body.Accordion` children. */
export const ACCORDION_PART_NAME = 'accordion';

/** Part factory for `FlyoutTemplate.Body.Accordion`. */
export const accordionPart = bodyAssembly.definePart<Record<string, never>, ReactNode, void>({
  name: ACCORDION_PART_NAME,
});

/** Declarative `FlyoutTemplate.Body.Accordion`. */
export const Accordion = accordionPart.createComponent<FlyoutBodyAccordionProps>({
  resolve: ({
    id,
    title,
    icon,
    tooltip,
    action,
    initialIsOpen,
    children,
    'data-test-subj': dataTestSubj,
  }) => {
    const items = sectionAssembly.parseChildren(children, { supportsOtherChildren: true });
    const hasSubsections = items.some((i) => i.type === 'part' && i.part === SUBSECTION_PART_NAME);

    if (!hasSubsections) {
      return (
        <FlyoutAccordion
          id={id}
          title={title}
          icon={icon}
          tooltip={tooltip}
          action={action}
          initialIsOpen={initialIsOpen}
          data-test-subj={dataTestSubj}
        >
          {children}
        </FlyoutAccordion>
      );
    }

    // Subsections present: border lands on each subsection; outer accordion must not also have one.
    return (
      <FlyoutAccordion
        id={id}
        title={title}
        icon={icon}
        tooltip={tooltip}
        action={action}
        initialIsOpen={initialIsOpen}
        hasBorder={false}
        data-test-subj={dataTestSubj}
      >
        {items.map((item, index) => {
          if (item.type === 'child') {
            return <Fragment key={`passthrough-${index}`}>{item.node}</Fragment>;
          }
          return (
            <Fragment key={item.instanceId}>
              {subsectionPart.resolve(item, { hasBorder: true }) ?? null}
            </Fragment>
          );
        })}
      </FlyoutAccordion>
    );
  },
});

Accordion.displayName = 'FlyoutTemplate.Body.Accordion';
