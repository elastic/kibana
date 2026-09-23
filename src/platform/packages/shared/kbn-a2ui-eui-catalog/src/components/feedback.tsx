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
  EuiDescriptionList,
  EuiHealth,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiProgress,
  EuiSpacer,
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
