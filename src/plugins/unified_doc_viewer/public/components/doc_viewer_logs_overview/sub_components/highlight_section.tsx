/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { PropsWithChildren, useReducer } from 'react';
import {
  EuiAccordion,
  EuiFlexGrid,
  EuiHorizontalRule,
  EuiTitle,
  useGeneratedHtmlId,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

interface HighlightSectionProps {
  title: string;
  visibleItems?: number;
}

export function HighlightSection({
  children,
  title,
  visibleItems = 6,
  ...props
}: PropsWithChildren<HighlightSectionProps>) {
  const validChildren = React.Children.toArray(children).filter(Boolean);
  const childrenLength = validChildren.length;
  const shouldRenderSection = childrenLength > 0;
  const limitedChildren = validChildren.slice(0, visibleItems - 1);
  const [isListExpanded, expandList] = useReducer(() => true, childrenLength <= visibleItems);

  const accordionId = useGeneratedHtmlId({
    prefix: title,
  });

  const showMoreButtonLabel = i18n.translate(
    'unifiedDocViewer.docView.logsOverview.section.showMore',
    {
      defaultMessage: '+ {count} more',
      values: { count: childrenLength - limitedChildren.length },
    }
  );

  const showMoreButton = (
    <EuiButtonEmpty
      key={title}
      data-test-subj="unifiedDocViewLogsOverviewHighlightSectionShowMoreButton"
      size="xs"
      flush="left"
      css={{ width: '80px' }}
      onClick={expandList}
    >
      {showMoreButtonLabel}
    </EuiButtonEmpty>
  );

  limitedChildren.push(showMoreButton);

  const accordionTitle = (
    <EuiTitle size="xs">
      <p>{title}</p>
    </EuiTitle>
  );

  const displayedItems = isListExpanded ? validChildren : limitedChildren;

  return shouldRenderSection ? (
    <>
      <EuiAccordion
        id={accordionId}
        buttonContent={accordionTitle}
        paddingSize="m"
        initialIsOpen={true}
        {...props}
      >
        <EuiFlexGrid css={gridStyle} alignItems="start" gutterSize="m">
          {displayedItems}
        </EuiFlexGrid>
      </EuiAccordion>
      <EuiHorizontalRule margin="xs" />
    </>
  ) : null;
}

// Applying this custom css rule remove the need for custom runtime js to compute a responsive column layout
const gridStyle = css`
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
`;
