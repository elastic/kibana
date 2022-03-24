/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DiscoverNavigationProps } from '../../../utils/use_navigation_props';
interface TableRowDetailsProps {
  open: boolean;
  colLength: number;
  isTimeBased: boolean;
  singleDocProps: DiscoverNavigationProps;
  surrDocsProps: DiscoverNavigationProps;
  children: JSX.Element;
}

export const TableRowDetails = ({
  open,
  colLength,
  isTimeBased,
  singleDocProps,
  surrDocsProps,
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
                <EuiLink data-test-subj="docTableRowAction" {...surrDocsProps}>
                  <FormattedMessage
                    id="discover.docTable.tableRow.viewSurroundingDocumentsLinkText"
                    defaultMessage="View surrounding documents"
                  />
                </EuiLink>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink data-test-subj="docTableRowAction" {...singleDocProps}>
                <FormattedMessage
                  id="discover.docTable.tableRow.viewSingleDocumentLinkText"
                  defaultMessage="View single document"
                />
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div data-test-subj="docViewer">{children}</div>
    </td>
  );
};
