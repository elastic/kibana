/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter } from '@elastic/eui';
import type { FlyoutFooterProps } from '../types';
import { flyoutAssembly } from '../assembly';
import { resolveZoneTestSubj, useFlyoutTemplateConfig } from '../context';
import { PrimaryAction, SecondaryAction, primaryActionPart, secondaryActionPart } from './action';

/** Part name used for identifying the `Footer` zone. */
export const FOOTER_PART_NAME = 'footer';

const footerPart = flyoutAssembly.definePart({ name: FOOTER_PART_NAME });

/** Declarative `FlyoutTemplate.Footer`; the root renders the collected attributes. */
const BaseFooter = footerPart.createComponent<FlyoutFooterProps>();
BaseFooter.displayName = 'FlyoutTemplate.Footer';

export const Footer = Object.assign(BaseFooter, { PrimaryAction, SecondaryAction });

/** Internal renderer for optional primary/secondary footer actions. */
export const FooterZone = ({ children, 'data-test-subj': dataTestSubj }: FlyoutFooterProps) => {
  const { dataTestSubj: rootTestSubj } = useFlyoutTemplateConfig();
  const [primary] = primaryActionPart.parseChildren(children);
  const [secondary] = secondaryActionPart.parseChildren(children);
  const primaryAction = primary ? primaryActionPart.resolve(primary, undefined) : null;
  const secondaryAction = secondary ? secondaryActionPart.resolve(secondary, undefined) : null;

  if (!primaryAction && !secondaryAction) {
    return null;
  }

  return (
    <EuiFlyoutFooter data-test-subj={resolveZoneTestSubj(dataTestSubj, rootTestSubj, 'Footer')}>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        {secondaryAction && <EuiFlexItem grow={false}>{secondaryAction}</EuiFlexItem>}
        {primaryAction && <EuiFlexItem grow={false}>{primaryAction}</EuiFlexItem>}
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
