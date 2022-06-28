/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiPopover,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { euiLightVars } from '@kbn/ui-theme';

interface ToolBarPaginationProps {
  pageSize: number;
  pageCount: number;
  activePage: number;
  onPageClick: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const TOOL_BAR_PAGINATION_STYLES = {
  marginLeft: 'auto',
  marginRight: euiLightVars.euiSizeL,
};

export const ToolBarPagination = ({
  pageSize,
  pageCount,
  activePage,
  onPageSizeChange,
  onPageClick,
}: ToolBarPaginationProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const rowsWord = i18n.translate('discover.docTable.rows', {
    defaultMessage: 'rows',
  });

  const onChooseRowsClick = () => setIsPopoverOpen((prevIsPopoverOpen) => !prevIsPopoverOpen);

  const closePopover = () => setIsPopoverOpen(false);

  const getIconType = (size: number) => {
    return size === pageSize ? 'check' : 'empty';
  };

  const rowsPerPageOptions = [25, 50, 100].map((cur) => (
    <EuiContextMenuItem
      key={`${cur} rows`}
      icon={getIconType(cur)}
      onClick={() => {
        closePopover();
        onPageSizeChange(cur);
      }}
    >
      {cur} {rowsWord}
    </EuiContextMenuItem>
  ));

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonEmpty
              size="xs"
              color="text"
              iconType="arrowDown"
              iconSide="right"
              onClick={onChooseRowsClick}
            >
              <FormattedMessage
                id="discover.docTable.rowsPerPage"
                defaultMessage="Rows per page: {pageSize}"
                values={{ pageSize }}
              />
            </EuiButtonEmpty>
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
        >
          <EuiContextMenuPanel items={rowsPerPageOptions} />
        </EuiPopover>
      </EuiFlexItem>

      <EuiFlexItem grow={false} style={TOOL_BAR_PAGINATION_STYLES}>
        <EuiPagination
          aria-label={i18n.translate('discover.docTable.documentsNavigation', {
            defaultMessage: 'Documents navigation',
          })}
          pageCount={pageCount}
          activePage={activePage}
          onPageClick={onPageClick}
          compressed
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
