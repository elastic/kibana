/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHorizontalRule, EuiListGroup } from '@elastic/eui';

import { ContextRow } from '../context_row';
import { LinksList } from '../links_list';
import type { ContextRowModel } from '../types';
import { type LinksListItem } from '../types';

export interface ContextMenuViewProps {
  readonly environmentRow: ContextRowModel;
  readonly spacesRow: ContextRowModel;
  readonly footerLinks?: ReadonlyArray<LinksListItem>;
  readonly onClickEnvironmentRow: () => void;
  readonly onClickSpacesRow: () => void;
}

/**
 * The menu view for the context switcher that contains the environment row and the spaces row.
 */

export const ContextMenuView = ({
  environmentRow,
  spacesRow,
  onClickEnvironmentRow,
  onClickSpacesRow,
  footerLinks,
}: ContextMenuViewProps) => {
  return (
    <>
      <EuiListGroup gutterSize="none" flush>
        <ContextRow row={environmentRow} onClick={onClickEnvironmentRow} />
        <ContextRow row={spacesRow} onClick={onClickSpacesRow} />
      </EuiListGroup>

      {!!footerLinks?.length && (
        <>
          <EuiHorizontalRule margin="xs" />
          <LinksList items={footerLinks} />
        </>
      )}
    </>
  );
};
