/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiProgress,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { Action, CatalogComponent, ComponentRenderProps } from '@kbn/a2ui-renderer';
import { bool, num, objectArray, oneOf, optionalStr, str } from '../coerce';

const STATUS_COLORS = ['subdued', 'primary', 'success', 'warning', 'danger', 'accent'] as const;

/**
 * A dialog whose visibility is a data model value, so opening and closing it is
 * an ordinary binding rather than hidden component state. Anything that can
 * write to the data model — a table row action, a button — can open it.
 */
function ModalRenderer({ props, rawProps, buildChild, dispatchAction }: ComponentRenderProps) {
  const titleId = useGeneratedHtmlId();
  if (!bool(props.isOpen)) return null;

  const close = () => dispatchAction(rawProps.onClose as Action | undefined);

  return (
    <EuiModal onClose={close} aria-labelledby={titleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{str(props.title)}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>{buildChild(props.child as string)}</EuiModalBody>
      {rawProps.footer ? (
        <EuiModalFooter>{buildChild(props.footer as string)}</EuiModalFooter>
      ) : null}
    </EuiModal>
  );
}

export const Modal: CatalogComponent = { name: 'Modal', render: ModalRenderer };

/**
 * A side panel for the detail of one thing, following Modal exactly: visibility is
 * a binding, not component state, so a table row action or a grid cell can open it.
 *
 * Only overlay flyouts are offered. A `push` flyout renders in place rather than in
 * a portal, and the host draws panels inside an `overflow: hidden` container, so it
 * would be clipped.
 */
function FlyoutRenderer({ props, rawProps, buildChild, dispatchAction }: ComponentRenderProps) {
  const titleId = useGeneratedHtmlId();
  if (!bool(props.isOpen)) return null;

  return (
    <EuiFlyout
      // `onClose` is required by the schema: unlike a modal a flyout does not
      // block the page, so one with no way out is a trap rather than a nuisance.
      onClose={() => dispatchAction(rawProps.onClose as Action | undefined)}
      size={oneOf(props.size, ['s', 'm', 'l'] as const, 'm')}
      paddingSize={oneOf(props.paddingSize, ['none', 's', 'm', 'l'] as const, 'l')}
      aria-labelledby={titleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{str(props.title)}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{buildChild(props.child as string)}</EuiFlyoutBody>
      {rawProps.footer ? (
        <EuiFlyoutFooter>{buildChild(props.footer as string)}</EuiFlyoutFooter>
      ) : null}
    </EuiFlyout>
  );
}

export const Flyout: CatalogComponent = { name: 'Flyout', render: FlyoutRenderer };

const ANCHOR_POSITIONS = [
  'downLeft',
  'downRight',
  'downCenter',
  'upLeft',
  'upRight',
  'leftCenter',
  'rightCenter',
] as const;

/**
 * Content anchored to another component — a menu, or a small form. Like Modal and
 * Flyout its visibility is a binding, so the anchor's own action opens it.
 *
 * The anchor is rendered inside the panel while EUI portals the popover panel out,
 * so `repositionOnScroll` is forced on: without it the panel stays pinned to the
 * viewport while the panel content scrolls away underneath.
 */
function PopoverRenderer({ props, rawProps, buildChild, dispatchAction }: ComponentRenderProps) {
  const isOpen = bool(props.isOpen);
  const title = optionalStr(props.title);
  const hasBack = rawProps.onBack !== undefined && rawProps.onBack !== null;
  const width = num(props.width, 0);

  return (
    <EuiPopover
      button={<>{buildChild(props.anchor as string)}</>}
      isOpen={isOpen}
      closePopover={() => dispatchAction(rawProps.onClose as Action | undefined)}
      anchorPosition={oneOf(props.anchorPosition, ANCHOR_POSITIONS, 'downLeft')}
      panelPaddingSize={oneOf(props.panelPaddingSize, ['none', 's', 'm', 'l'] as const, 'm')}
      repositionOnScroll
      // The panel is portaled away from its anchor, so it needs its own name.
      aria-label={title ?? str(props.title, 'Menu')}
    >
      {(title || hasBack) && (
        <EuiPopoverTitle>
          {hasBack ? (
            <EuiButtonEmpty
              size="xs"
              flush="left"
              iconType="chevronSingleLeft"
              onClick={() => dispatchAction(rawProps.onBack as Action | undefined)}
            >
              {title ?? 'Back'}
            </EuiButtonEmpty>
          ) : (
            title
          )}
        </EuiPopoverTitle>
      )}
      {/* An author-supplied pixel width is a runtime value, so it belongs inline. */}
      <div style={width > 0 ? { width } : undefined}>{buildChild(props.child as string)}</div>
      {rawProps.footer ? (
        <EuiPopoverFooter>{buildChild(props.footer as string)}</EuiPopoverFooter>
      ) : null}
    </EuiPopover>
  );
}

export const Popover: CatalogComponent = { name: 'Popover', render: PopoverRenderer };

function AccordionRenderer({ id, props, buildChild }: ComponentRenderProps) {
  return (
    <EuiAccordion
      id={id}
      buttonContent={str(props.label)}
      initialIsOpen={bool(props.initialIsOpen)}
      paddingSize="s"
    >
      {buildChild(props.child as string)}
    </EuiAccordion>
  );
}

export const Accordion: CatalogComponent = { name: 'Accordion', render: AccordionRenderer };

export const Health: CatalogComponent = {
  name: 'Health',
  render: ({ props, accessibility }) => (
    <EuiHealth
      color={oneOf(props.color, STATUS_COLORS, 'subdued')}
      aria-label={accessibility?.label}
    >
      {str(props.label)}
    </EuiHealth>
  ),
};

export const Link: CatalogComponent = {
  name: 'Link',
  render: ({ props, rawProps, dispatchAction, accessibility }) => {
    const href = optionalStr(props.href);
    return (
      <EuiLink
        href={href}
        target={href ? '_blank' : undefined}
        external={Boolean(href)}
        aria-label={accessibility?.label}
        onClick={
          rawProps.action ? () => dispatchAction(rawProps.action as Action | undefined) : undefined
        }
      >
        {str(props.label)}
      </EuiLink>
    );
  },
};

export const DescriptionList: CatalogComponent = {
  name: 'DescriptionList',
  render: ({ props, accessibility }) => (
    <EuiDescriptionList
      type={oneOf(props.variant, ['row', 'inline', 'column'] as const, 'row')}
      compressed={bool(props.compressed)}
      aria-label={accessibility?.label}
      listItems={objectArray(props.items).map((item) => ({
        title: str(item.title),
        description: str(item.description),
      }))}
    />
  ),
};

export const Progress: CatalogComponent = {
  name: 'Progress',
  render: ({ props, accessibility }) => (
    <>
      <EuiProgress
        value={num(props.value)}
        max={num(props.max, 100)}
        size="m"
        color={oneOf(props.color, STATUS_COLORS, 'primary')}
        label={optionalStr(props.label)}
        valueText={bool(props.showValue, true)}
        aria-label={accessibility?.label ?? str(props.label, 'Progress')}
      />
      <EuiSpacer size="xs" />
    </>
  ),
};
