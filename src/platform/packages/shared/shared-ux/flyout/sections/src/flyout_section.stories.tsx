/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiText, EuiTitle } from '@elastic/eui';
import { FlyoutSection } from './flyout_section';
import { FlyoutSubsection } from './flyout_subsection';
import { FlyoutAccordion } from './flyout_accordion';

const meta: Meta = {
  title: 'Flyout Template/Section',
};
export default meta;

const SECTION_TITLES = [
  'Summary',
  'Configuration',
  'Related alerts',
  'Findings',
  'Advanced settings',
];
const SUBSECTION_TITLES = ['Runtime', 'Environment', 'Dependencies'];

const FlyoutWrapper: React.FC<{ children: React.ReactNode; title: string }> = ({
  children,
  title,
}) => (
  <EuiFlyout
    onClose={action('Flyout closed')}
    size="m"
    aria-labelledby="storyFlyoutTitle"
    minWidth={324}
    resizable
    ownFocus={false}
  >
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 id="storyFlyoutTitle">{title}</h2>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>{children}</EuiFlyoutBody>
  </EuiFlyout>
);

const SampleText = () => (
  <EuiText size="s">
    <p>Sample content — a metrics chart, a data grid, or plain text goes here.</p>
  </EuiText>
);

// ─── FlyoutSection ───────────────────────────────────────────────────────────

interface SectionArgs {
  showIconAndTooltip: boolean;
  showAction: boolean;
  hasBorder: boolean;
  numberOfSections: number;
  numberOfSubsections: number;
}

export const Sections: StoryObj<SectionArgs> = {
  name: 'FlyoutSection',
  args: {
    showIconAndTooltip: false,
    showAction: false,
    hasBorder: false,
    numberOfSections: 2,
    numberOfSubsections: 0,
  },
  argTypes: {
    showIconAndTooltip: {
      name: 'Icon + tooltip',
      control: 'boolean',
    },
    showAction: {
      name: 'Action link',
      control: 'boolean',
    },
    hasBorder: {
      name: 'hasBorder',
      control: 'boolean',
      description:
        'When subsections are present the border moves from the outer section to each subsection.',
    },
    numberOfSections: {
      name: 'Number of sections',
      control: { type: 'range', min: 1, max: 5, step: 1 },
    },
    numberOfSubsections: {
      name: 'Number of subsections',
      control: { type: 'range', min: 0, max: 3, step: 1 },
    },
  },
  render: ({
    showIconAndTooltip,
    showAction,
    hasBorder,
    numberOfSections,
    numberOfSubsections,
  }) => (
    <FlyoutWrapper title="FlyoutSection">
      {Array.from({ length: numberOfSections }, (_sectionNumber, i) => (
        <FlyoutSection
          key={i}
          title={SECTION_TITLES[i] ?? `Section ${i + 1}`}
          icon={showIconAndTooltip ? 'info' : undefined}
          tooltip={showIconAndTooltip ? 'Helpful context about this section.' : undefined}
          action={
            showAction ? { label: 'View all', onClick: action('View all clicked') } : undefined
          }
          hasBorder={hasBorder && numberOfSubsections === 0}
        >
          {numberOfSubsections === 0 ? (
            <SampleText />
          ) : (
            Array.from({ length: numberOfSubsections }, (_subsectionNumber, j) => (
              <FlyoutSubsection
                key={j}
                title={SUBSECTION_TITLES[j] ?? `Subsection ${j + 1}`}
                hasBorder={hasBorder}
              >
                <SampleText />
              </FlyoutSubsection>
            ))
          )}
        </FlyoutSection>
      ))}
    </FlyoutWrapper>
  ),
};

// ─── FlyoutAccordion ─────────────────────────────────────────────────────────

interface AccordionArgs {
  showIconAndTooltip: boolean;
  showAction: boolean;
  numberOfSections: number;
  numberOfSubsections: number;
  initialIsOpen: boolean;
}

export const Accordions: StoryObj<AccordionArgs> = {
  name: 'FlyoutAccordion',
  args: {
    showIconAndTooltip: false,
    showAction: false,
    numberOfSections: 2,
    numberOfSubsections: 0,
    initialIsOpen: false,
  },
  argTypes: {
    showIconAndTooltip: {
      name: 'Icon + tooltip',
      control: 'boolean',
    },
    showAction: {
      name: 'Action link',
      control: 'boolean',
    },
    numberOfSections: {
      name: 'Number of accordions',
      control: { type: 'range', min: 1, max: 5, step: 1 },
    },
    numberOfSubsections: {
      name: 'Number of subsections',
      control: { type: 'range', min: 0, max: 3, step: 1 },
    },
    initialIsOpen: {
      name: 'Initially open',
      control: 'boolean',
    },
  },
  render: ({
    showIconAndTooltip,
    showAction,
    numberOfSections,
    numberOfSubsections,
    initialIsOpen,
  }) => (
    <FlyoutWrapper title="FlyoutAccordion">
      {Array.from({ length: numberOfSections }, (_sectionNumber, i) => (
        <FlyoutAccordion
          key={i}
          title={SECTION_TITLES[i] ?? `Accordion ${i + 1}`}
          icon={showIconAndTooltip ? 'info' : undefined}
          tooltip={showIconAndTooltip ? 'Helpful context about this accordion.' : undefined}
          action={
            showAction ? { label: 'View all', onClick: action('View all clicked') } : undefined
          }
          initialIsOpen={initialIsOpen}
        >
          {numberOfSubsections === 0 ? (
            <SampleText />
          ) : (
            Array.from({ length: numberOfSubsections }, (_subsectionNumber, j) => (
              <FlyoutSubsection key={j} title={SUBSECTION_TITLES[j] ?? `Subsection ${j + 1}`}>
                <SampleText />
              </FlyoutSubsection>
            ))
          )}
        </FlyoutAccordion>
      ))}
    </FlyoutWrapper>
  ),
};
