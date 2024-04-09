/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiFlexGrid,
  EuiHorizontalRule,
  EuiTitle,
  EuiFlexItem,
  useGeneratedHtmlId,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface HighlightSectionProps {
  title: string;
  children: React.ReactNode;
  columns: 1 | 2 | 3;
}

const CHILDREN_PER_SECTION: 3 | 6 | 9 = 6;

export function HighlightSection({ title, children, columns, ...props }: HighlightSectionProps) {
  const validChildren = React.Children.toArray(children).filter(Boolean);
  const childLength = validChildren.length;
  const shouldRenderSection = childLength > 0;
  const limitedChildren = validChildren.slice(0, CHILDREN_PER_SECTION - 1);
  const [showMore, setShowMore] = useState(childLength > CHILDREN_PER_SECTION);

  const accordionId = useGeneratedHtmlId({
    prefix: title,
  });

  const showMoreButtonLabel = i18n.translate(
    'unifiedDocViewer.docView.logsOverview.section.showMore',
    {
      defaultMessage: '+ {count} more',
      values: { count: childLength - limitedChildren.length },
    }
  );

  const showMoreButton = (
    <EuiButtonEmpty
      data-test-subj="unifiedDocViewLogsOverviewHighlightSectionShowMoreButton"
      size="xs"
      flush="left"
      css={{ width: '80px' }}
      onClick={() => {
        setShowMore(false);
      }}
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

  const flexChildren = (showMore ? limitedChildren : validChildren).map((child, idx) => (
    <EuiFlexItem key={idx}>{child}</EuiFlexItem>
  ));

  return shouldRenderSection ? (
    <>
      <EuiAccordion
        id={accordionId}
        buttonContent={accordionTitle}
        paddingSize="m"
        initialIsOpen={true}
        {...props}
      >
        <EuiFlexGrid columns={columns} alignItems="start" gutterSize="m">
          {flexChildren}
        </EuiFlexGrid>
      </EuiAccordion>
      <EuiHorizontalRule margin="xs" />
    </>
  ) : null;
}
