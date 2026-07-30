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
import { useSerializableState } from './serializable_state';

export const AccordionRegular = () => {
  const [open, setOpen] = useSerializableState('open', false);
  return (
    <EuiAccordion
      id="designToolsAccordion"
      buttonContent="Click me to toggle"
      forceState={open ? 'open' : 'closed'}
      onToggle={(isOpen) => setOpen(isOpen)}
    >
      <EuiText size="s">
        <p>Any content inside of EuiAccordion will appear here.</p>
      </EuiText>
    </EuiAccordion>
  );
};

export const AccordionOpen = () => {
  const [open, setOpen] = useSerializableState('open', true);
  return (
    <EuiAccordion
      id="designToolsAccordionOpen"
      buttonContent="Opened by default"
      forceState={open ? 'open' : 'closed'}
      onToggle={(isOpen) => setOpen(isOpen)}
      paddingSize="m"
    >
      <EuiText size="s">
        <p>This accordion starts open and has padding applied.</p>
      </EuiText>
    </EuiAccordion>
  );
};

export const AccordionArrowRight = () => {
  const [open, setOpen] = useSerializableState('open', false);
  return (
    <EuiAccordion
      id="designToolsAccordionRight"
      buttonContent="Arrow on the right"
      arrowDisplay="right"
      forceState={open ? 'open' : 'closed'}
      onToggle={(isOpen) => setOpen(isOpen)}
      paddingSize="m"
    >
      <EuiText size="s">
        <p>The arrow indicator is on the right side.</p>
      </EuiText>
    </EuiAccordion>
  );
};

export const AccordionBorders = () => {
  const [open, setOpen] = useSerializableState('open', false);
  return (
    <EuiAccordion
      id="designToolsAccordionBorders"
      buttonContent="With borders"
      borders="all"
      forceState={open ? 'open' : 'closed'}
      onToggle={(isOpen) => setOpen(isOpen)}
      paddingSize="m"
    >
      <EuiText size="s">
        <p>This accordion has border styling applied.</p>
      </EuiText>
    </EuiAccordion>
  );
};

export const AccordionMultiple = () => {
  const [openStr, setOpenStr] = useSerializableState('open', '');

  const isOpen = (id: string) => {
    const set = openStr ? openStr.split(',') : [];
    return set.includes(id);
  };

  const toggle = (id: string, opened: boolean) => {
    setOpenStr((prev) => {
      const set = new Set(prev ? prev.split(',') : []);
      if (opened) set.add(id);
      else set.delete(id);
      return [...set].join(',');
    });
  };

  return (
    <div>
      <EuiAccordion
        id="designToolsAccordionMulti1"
        buttonContent="First section"
        forceState={isOpen('1') ? 'open' : 'closed'}
        onToggle={(o) => toggle('1', o)}
        paddingSize="m"
      >
        <EuiText size="s">
          <p>Content for the first section.</p>
        </EuiText>
      </EuiAccordion>
      <EuiSpacer size="s" />
      <EuiAccordion
        id="designToolsAccordionMulti2"
        buttonContent="Second section"
        forceState={isOpen('2') ? 'open' : 'closed'}
        onToggle={(o) => toggle('2', o)}
        paddingSize="m"
      >
        <EuiText size="s">
          <p>Content for the second section.</p>
        </EuiText>
      </EuiAccordion>
      <EuiSpacer size="s" />
      <EuiAccordion
        id="designToolsAccordionMulti3"
        buttonContent="Third section"
        forceState={isOpen('3') ? 'open' : 'closed'}
        onToggle={(o) => toggle('3', o)}
        paddingSize="m"
      >
        <EuiText size="s">
          <p>Content for the third section.</p>
        </EuiText>
      </EuiAccordion>
    </div>
  );
};
