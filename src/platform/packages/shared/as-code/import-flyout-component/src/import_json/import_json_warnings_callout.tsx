/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, type ReactNode } from 'react';
import { EuiAccordion, EuiBasicTable, EuiSpacer, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { importJsonFlyoutStrings } from './import_json_strings';
import type { ImportJsonRelatedItem } from './types';
import { useScrollableListStyles } from './use_scrollable_list_styles';

const RELATED_ITEMS_COLUMNS: Array<EuiBasicTableColumn<ImportJsonRelatedItem>> = [
  {
    field: 'type_label',
    name: importJsonFlyoutStrings.getRelatedItemsTypeColumn(),
  },
  {
    field: 'id',
    name: importJsonFlyoutStrings.getRelatedItemsIdColumn(),
  },
];

interface RelatedItemsSectionProps {
  accordionId: string;
  dataTestSubj: string;
  summary: ReactNode;
  items: ImportJsonRelatedItem[];
  tableCaption: string;
}

const RelatedItemsSection = ({
  accordionId,
  dataTestSubj,
  summary,
  items,
  tableCaption,
}: RelatedItemsSectionProps) => {
  const listStyles = useScrollableListStyles();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <EuiText size="s" data-test-subj={`${dataTestSubj}Summary`}>
        {summary}
      </EuiText>
      {items.length > 0 && (
        <EuiAccordion
          id={accordionId}
          initialIsOpen={false}
          onToggle={setIsExpanded}
          paddingSize="s"
          buttonContent={
            isExpanded
              ? importJsonFlyoutStrings.getWarningsAccordionHide()
              : importJsonFlyoutStrings.getWarningsAccordionShow()
          }
          data-test-subj={`${dataTestSubj}Accordion`}
        >
          {isExpanded ? (
            <div data-test-subj={`${dataTestSubj}List`} css={listStyles}>
              <EuiBasicTable
                compressed
                items={items}
                columns={RELATED_ITEMS_COLUMNS}
                tableCaption={tableCaption}
                responsiveBreakpoint={false}
              />
            </div>
          ) : null}
        </EuiAccordion>
      )}
    </>
  );
};

interface ImportJsonWarningsCalloutProps {
  dataTestSubjPrefix: string;
  warnings: string[];
  relatedItems: ImportJsonRelatedItem[];
  relatedItemsCount: number;
  getWarningsSummary?: (count: number) => string;
  /** Override the default summary of related items that don't exist in this cluster or space. */
  getMissingRelatedItemsSummary?: (count: number) => string;
}

/** Shows the warnings returned by sanitization and the related items the imported state depends on. */
export const ImportJsonWarningsCallout = ({
  dataTestSubjPrefix,
  warnings,
  relatedItems,
  relatedItemsCount,
  getWarningsSummary,
  getMissingRelatedItemsSummary,
}: ImportJsonWarningsCalloutProps) => {
  const listStyles = useScrollableListStyles();
  const warningsAccordionId = useGeneratedHtmlId({
    prefix: `${dataTestSubjPrefix}Warnings`,
  });
  const relatedItemsAccordionId = useGeneratedHtmlId({
    prefix: `${dataTestSubjPrefix}RelatedItems`,
  });
  const missingRelatedItemsAccordionId = useGeneratedHtmlId({
    prefix: `${dataTestSubjPrefix}MissingRelatedItems`,
  });
  const [isWarningsExpanded, setIsWarningsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const warningsSummary =
    getWarningsSummary?.(warnings.length) ??
    importJsonFlyoutStrings.getWarningsSummary(warnings.length);

  const missingItems = relatedItems.filter(({ isMissing }) => isMissing === true);
  const uncheckedItems = relatedItems.filter(({ isMissing }) => isMissing === undefined);
  const foundItemsCount = relatedItems.length - missingItems.length - uncheckedItems.length;
  // Items left out of a truncated `relatedItems` list were never checked
  const uncheckedItemsCount = Math.max(
    relatedItemsCount - foundItemsCount - missingItems.length,
    uncheckedItems.length
  );
  const hasRelatedItems = missingItems.length > 0 || uncheckedItemsCount > 0;

  if (!isVisible || (warnings.length === 0 && !hasRelatedItems)) {
    return null;
  }

  return (
    <>
      <KbnWarningCallout
        announceOnMount
        size="s"
        title={
          hasRelatedItems
            ? importJsonFlyoutStrings.getReviewWarningsTitle()
            : importJsonFlyoutStrings.getWarningsTitle()
        }
        text={hasRelatedItems ? undefined : warningsSummary}
        data-test-subj={`${dataTestSubjPrefix}Warnings`}
        onDismiss={() => {
          setIsVisible(false);
          setIsWarningsExpanded(false);
        }}
      >
        {warnings.length > 0 && (
          <>
            {hasRelatedItems && (
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
        {missingItems.length > 0 && (
          <>
            {warnings.length > 0 && <EuiSpacer size="s" />}
            <RelatedItemsSection
              accordionId={missingRelatedItemsAccordionId}
              dataTestSubj={`${dataTestSubjPrefix}MissingRelatedItems`}
              summary={
                <p>
                  {getMissingRelatedItemsSummary?.(missingItems.length) ??
                    importJsonFlyoutStrings.getMissingRelatedItemsSummary(missingItems.length)}
                </p>
              }
              items={missingItems}
              tableCaption={importJsonFlyoutStrings.getMissingRelatedItemsTableCaption()}
            />
          </>
        )}
        {uncheckedItemsCount > 0 && (
          <>
            {(warnings.length > 0 || missingItems.length > 0) && <EuiSpacer size="s" />}
            <RelatedItemsSection
              accordionId={relatedItemsAccordionId}
              dataTestSubj={`${dataTestSubjPrefix}RelatedItems`}
              summary={
                <>
                  <p>{importJsonFlyoutStrings.getRelatedItemsSummary(uncheckedItemsCount)}</p>
                  {uncheckedItems.length > 0 && uncheckedItemsCount > uncheckedItems.length && (
                    <p>
                      {importJsonFlyoutStrings.getRelatedItemsTruncatedSummary(
                        uncheckedItems.length
                      )}
                    </p>
                  )}
                </>
              }
              items={uncheckedItems}
              tableCaption={importJsonFlyoutStrings.getRelatedItemsTableCaption()}
            />
          </>
        )}
      </KbnWarningCallout>
      <EuiSpacer size="m" />
    </>
  );
};
