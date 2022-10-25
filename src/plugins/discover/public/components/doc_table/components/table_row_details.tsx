/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiButtonEmpty, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface TableRowDetailsProps {
  open: boolean;
  colLength: number;
  isTimeBased: boolean;
  singleDocHref: string;
  contextViewHref: string;
  singleDocButtonRef: (buttonElement: HTMLButtonElement | HTMLAnchorElement | null) => void;
  contextViewButtonRef: (buttonElement: HTMLButtonElement | HTMLAnchorElement | null) => void;
  children: JSX.Element;
}

export const TableRowDetails = ({
  singleDocHref,
  contextViewHref,
  singleDocButtonRef,
  contextViewButtonRef,
  open,
  colLength,
  isTimeBased,
  children,
}: TableRowDetailsProps) => {
  if (!open) {
    return null;
  }

  return (
    <td colSpan={(colLength || 1) + 2}>
      <EuiFlexGroup gutterSize="l" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="folderOpen" size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs" data-test-subj="docTableRowDetailsTitle">
                <h4>
                  <FormattedMessage
                    id="discover.docTable.tableRow.detailHeading"
                    defaultMessage="Expanded document"
                  />
                </h4>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="l" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {isTimeBased && (
                <EuiButtonEmpty
                  size="s"
                  iconSize="s"
                  iconType="document"
                  flush="left"
                  data-test-subj="docTableRowAction"
                  href={contextViewHref}
                  buttonRef={contextViewButtonRef}
                >
                  <FormattedMessage
                    id="discover.docTable.tableRow.viewSurroundingDocumentsLinkText"
                    defaultMessage="View surrounding documents"
                  />
                </EuiButtonEmpty>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconSize="s"
                iconType="document"
                flush="left"
                data-test-subj="docTableRowAction"
                href={singleDocHref}
                buttonRef={singleDocButtonRef}
              >
                <FormattedMessage
                  id="discover.docTable.tableRow.viewSingleDocumentLinkText"
                  defaultMessage="View single document"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div data-test-subj="docViewer">{children}</div>
    </td>
  );
};
