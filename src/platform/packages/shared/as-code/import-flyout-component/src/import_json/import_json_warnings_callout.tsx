/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiSpacer,
  EuiText,
  euiYScrollWithShadows,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AsCodeRelatedItem } from '@kbn/as-code-shared-schemas';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { importJsonFlyoutStrings } from './import_json_strings';

const RELATED_ITEMS_COLUMNS: Array<EuiBasicTableColumn<AsCodeRelatedItem>> = [
  {
    field: 'type_label',
    name: importJsonFlyoutStrings.getRelatedItemsTypeColumn(),
  },
  {
    field: 'id',
    name: importJsonFlyoutStrings.getRelatedItemsIdColumn(),
  },
];

interface ImportJsonWarningsCalloutProps {
  dataTestSubjPrefix: string;
  warnings: string[];
  relatedItems: AsCodeRelatedItem[];
  relatedItemsCount: number;
  getWarningsSummary?: (count: number) => string;
}

export const ImportJsonWarningsCallout = ({
  dataTestSubjPrefix,
  warnings,
  relatedItems,
  relatedItemsCount,
  getWarningsSummary,
}: ImportJsonWarningsCalloutProps) => {
  const euiThemeContext = useEuiTheme();
  const warningsAccordionId = useGeneratedHtmlId({
    prefix: `${dataTestSubjPrefix}Warnings`,
  });
  const relatedItemsAccordionId = useGeneratedHtmlId({
    prefix: `${dataTestSubjPrefix}RelatedItems`,
  });
  const [isWarningsExpanded, setIsWarningsExpanded] = useState(false);
  const [isRelatedItemsExpanded, setIsRelatedItemsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const listStyles = useMemo(
    () => css`
      ${euiYScrollWithShadows(euiThemeContext, { height: 'auto' })}
      max-height: 240px;
      padding-top: ${euiThemeContext.euiTheme.size.s};
      padding-bottom: ${euiThemeContext.euiTheme.size.s};
    `,
    [euiThemeContext]
  );
  const warningsSummary =
    getWarningsSummary?.(warnings.length) ??
    importJsonFlyoutStrings.getWarningsSummary(warnings.length);

  if (!isVisible || (warnings.length === 0 && relatedItems.length === 0)) {
    return null;
  }

  return (
    <>
      <KbnWarningCallout
        announceOnMount
        size="s"
        title={
          relatedItems.length > 0
            ? importJsonFlyoutStrings.getReviewWarningsTitle()
            : importJsonFlyoutStrings.getWarningsTitle()
        }
        text={relatedItems.length > 0 ? undefined : warningsSummary}
        data-test-subj={`${dataTestSubjPrefix}Warnings`}
        onDismiss={() => {
          setIsVisible(false);
          setIsWarningsExpanded(false);
          setIsRelatedItemsExpanded(false);
        }}
      >
        {warnings.length > 0 && (
          <>
            {relatedItems.length > 0 && (
              <EuiText size="s">
                <p>{warningsSummary}</p>
              </EuiText>
            )}
            <EuiAccordion
              id={warningsAccordionId}
              initialIsOpen={false}
              onToggle={setIsWarningsExpanded}
              paddingSize="s"
              buttonContent={
                isWarningsExpanded
                  ? importJsonFlyoutStrings.getWarningsAccordionHide()
                  : importJsonFlyoutStrings.getWarningsAccordionShow()
              }
              data-test-subj={`${dataTestSubjPrefix}WarningsAccordion`}
            >
              {isWarningsExpanded ? (
                <EuiText
                  size="s"
                  data-test-subj={`${dataTestSubjPrefix}WarningsList`}
                  css={listStyles}
                >
                  <ul>
                    {warnings.map((warning, index) => (
                      <li key={`${index}-${warning}`}>{warning}</li>
                    ))}
                  </ul>
                </EuiText>
              ) : null}
            </EuiAccordion>
          </>
        )}
        {relatedItems.length > 0 && (
          <>
            {warnings.length > 0 && <EuiSpacer size="s" />}
            <EuiText size="s">
              <p>{importJsonFlyoutStrings.getRelatedItemsSummary(relatedItemsCount)}</p>
              {relatedItemsCount > relatedItems.length && (
                <p>
                  {importJsonFlyoutStrings.getRelatedItemsTruncatedSummary(relatedItems.length)}
                </p>
              )}
            </EuiText>
            <EuiAccordion
              id={relatedItemsAccordionId}
              initialIsOpen={false}
              onToggle={setIsRelatedItemsExpanded}
              paddingSize="s"
              buttonContent={
                isRelatedItemsExpanded
                  ? importJsonFlyoutStrings.getWarningsAccordionHide()
                  : importJsonFlyoutStrings.getWarningsAccordionShow()
              }
              data-test-subj={`${dataTestSubjPrefix}RelatedItemsAccordion`}
            >
              {isRelatedItemsExpanded ? (
                <div data-test-subj={`${dataTestSubjPrefix}RelatedItemsList`} css={listStyles}>
                  <EuiBasicTable
                    compressed
                    items={relatedItems}
                    columns={RELATED_ITEMS_COLUMNS}
                    tableCaption={importJsonFlyoutStrings.getRelatedItemsTableCaption()}
                    responsiveBreakpoint={false}
                  />
                </div>
              ) : null}
            </EuiAccordion>
          </>
        )}
      </KbnWarningCallout>
      <EuiSpacer size="m" />
    </>
  );
};
