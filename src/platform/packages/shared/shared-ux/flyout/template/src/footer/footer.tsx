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
import type { FlyoutFooterPrimaryActionMenuProps, FlyoutFooterProps } from '../types';
import { flyoutAssembly, footerAssembly, partsOf } from '../assembly';
import { resolveZoneTestSubj, useFlyoutTemplateConfig } from '../context';
import {
  PrimaryAction,
  PrimaryActionMenu,
  SecondaryAction,
  primaryActionMenuPart,
  primaryActionPart,
  secondaryActionPart,
  PRIMARY_ACTION_MENU_PART_NAME,
  PRIMARY_ACTION_PART_NAME,
  SECONDARY_ACTION_PART_NAME,
} from './action';

/** Part name used for identifying the `Footer` zone. */
export const FOOTER_PART_NAME = 'footer';

const footerPart = flyoutAssembly.definePart({ name: FOOTER_PART_NAME });

/** Declarative `FlyoutTemplate.Footer`; the root renders the collected attributes. */
const BaseFooter = footerPart.createComponent<FlyoutFooterProps>();
BaseFooter.displayName = 'FlyoutTemplate.Footer';

export const Footer = Object.assign(BaseFooter, {
  PrimaryAction,
  SecondaryAction,
  PrimaryActionMenu,
});

/** Internal renderer for optional primary/secondary footer actions. */
export const FooterZone = ({ children, 'data-test-subj': dataTestSubj }: FlyoutFooterProps) => {
  const { dataTestSubj: rootTestSubj } = useFlyoutTemplateConfig();
  const items = footerAssembly.parseChildren(children);

  const [secondary] = partsOf(items, SECONDARY_ACTION_PART_NAME);
  const [primary] = partsOf(items, PRIMARY_ACTION_PART_NAME);

  // A menu with no panels has nothing to open, so it does not claim the primary slot;
  // skip past any such menu rather than letting it mask a later one that has content.
  const activeMenu = partsOf(items, PRIMARY_ACTION_MENU_PART_NAME).find(
    (part) => (part.attributes as unknown as FlyoutFooterPrimaryActionMenuProps).panels?.length
  );

  if (process.env.NODE_ENV !== 'production' && primary && activeMenu) {
    // eslint-disable-next-line no-console
    console.warn(
      '[FlyoutTemplate] <FlyoutTemplate.Footer> takes either a PrimaryAction or a ' +
        'PrimaryActionMenu, not both; rendering the PrimaryActionMenu and ignoring the PrimaryAction.'
    );
  }

  const primarySlot = activeMenu
    ? primaryActionMenuPart.resolve(activeMenu, undefined)
    : primary
    ? primaryActionPart.resolve(primary, undefined)
    : null;
  const secondaryAction = secondary ? secondaryActionPart.resolve(secondary, undefined) : null;

  if (!primarySlot && !secondaryAction) {
    return null;
  }

  return (
    <EuiFlyoutFooter data-test-subj={resolveZoneTestSubj(dataTestSubj, rootTestSubj, 'Footer')}>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        {secondaryAction && <EuiFlexItem grow={false}>{secondaryAction}</EuiFlexItem>}
        {primarySlot && <EuiFlexItem grow={false}>{primarySlot}</EuiFlexItem>}
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
