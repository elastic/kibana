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

  const secondaries = partsOf(items, SECONDARY_ACTION_PART_NAME);
  const [primary] = partsOf(items, PRIMARY_ACTION_PART_NAME);
  const leftSecondaries = secondaries.filter((part) => part.attributes.side !== 'right');
  const rightSecondaries = secondaries.filter((part) => part.attributes.side === 'right');

  // A menu with no panels has nothing to open, so it does not claim the primary slot;
  // skip past any such menu rather than letting it mask a later one that has content.
  const activeMenu = partsOf(items, PRIMARY_ACTION_MENU_PART_NAME).find(
    (part) => Array.isArray(part.attributes.panels) && part.attributes.panels.length > 0
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
  const leftSecondaryActions = leftSecondaries
    .map((part) => secondaryActionPart.resolve(part, undefined))
    .filter(Boolean);
  const rightSecondaryActions = rightSecondaries
    .map((part) => secondaryActionPart.resolve(part, undefined))
    .filter(Boolean);
  const hasLeftActions = leftSecondaryActions.length > 0;
  const hasRightActions = rightSecondaryActions.length > 0 || Boolean(primarySlot);

  if (!hasLeftActions && !hasRightActions) {
    return null;
  }

  return (
    <EuiFlyoutFooter data-test-subj={resolveZoneTestSubj(dataTestSubj, rootTestSubj, 'Footer')}>
      <EuiFlexGroup
        justifyContent={hasLeftActions ? 'spaceBetween' : 'flexEnd'}
        gutterSize="none"
        responsive={false}
      >
        {hasLeftActions && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {leftSecondaryActions.map((action, index) => (
                <EuiFlexItem grow={false} key={`left-secondary-${index}`}>
                  {action}
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
        {hasRightActions && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {rightSecondaryActions.map((action, index) => (
                <EuiFlexItem grow={false} key={`right-secondary-${index}`}>
                  {action}
                </EuiFlexItem>
              ))}
              {primarySlot && <EuiFlexItem grow={false}>{primarySlot}</EuiFlexItem>}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
