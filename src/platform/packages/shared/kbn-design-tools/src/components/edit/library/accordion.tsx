/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiAccordion, EuiText, EuiSpacer } from '@elastic/eui';

export const AccordionRegular = () => (
  <EuiAccordion id="designToolsAccordion" buttonContent="Click me to toggle">
    <EuiText size="s">
      <p>Any content inside of EuiAccordion will appear here.</p>
    </EuiText>
  </EuiAccordion>
);

export const AccordionOpen = () => (
  <EuiAccordion
    id="designToolsAccordionOpen"
    buttonContent="Opened by default"
    initialIsOpen
    paddingSize="m"
  >
    <EuiText size="s">
      <p>This accordion starts open and has padding applied.</p>
    </EuiText>
  </EuiAccordion>
);

export const AccordionArrowRight = () => (
  <EuiAccordion
    id="designToolsAccordionRight"
    buttonContent="Arrow on the right"
    arrowDisplay="right"
    paddingSize="m"
  >
    <EuiText size="s">
      <p>The arrow indicator is on the right side.</p>
    </EuiText>
  </EuiAccordion>
);

export const AccordionBorders = () => (
  <EuiAccordion
    id="designToolsAccordionBorders"
    buttonContent="With borders"
    borders="all"
    paddingSize="m"
  >
    <EuiText size="s">
      <p>This accordion has border styling applied.</p>
    </EuiText>
  </EuiAccordion>
);

export const AccordionMultiple = () => (
  <div>
    <EuiAccordion id="designToolsAccordionMulti1" buttonContent="First section" paddingSize="m">
      <EuiText size="s">
        <p>Content for the first section.</p>
      </EuiText>
    </EuiAccordion>
    <EuiSpacer size="s" />
    <EuiAccordion id="designToolsAccordionMulti2" buttonContent="Second section" paddingSize="m">
      <EuiText size="s">
        <p>Content for the second section.</p>
      </EuiText>
    </EuiAccordion>
    <EuiSpacer size="s" />
    <EuiAccordion id="designToolsAccordionMulti3" buttonContent="Third section" paddingSize="m">
      <EuiText size="s">
        <p>Content for the third section.</p>
      </EuiText>
    </EuiAccordion>
  </div>
);
