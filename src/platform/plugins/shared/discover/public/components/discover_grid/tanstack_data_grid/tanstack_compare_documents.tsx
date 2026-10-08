/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ComparisonControls,
  useComparisonFields,
  useRestorableLocalStorage,
  type DocMap,
  type CompareDocumentsProps,
} from '@kbn/unified-data-table';
import { TanStackComparisonTable } from './tanstack_comparison_table';

type ComparisonProps = Pick<
  CompareDocumentsProps,
  | 'consumer'
  | 'ariaLabelledBy'
  | 'dataView'
  | 'columnsMeta'
  | 'isPlainRecord'
  | 'selectedFieldNames'
  | 'selectedDocIds'
  | 'forceShowAllFields'
  | 'showFullScreenButton'
  | 'fieldFormats'
  | 'docMap'
  | 'replaceSelectedDocs'
  | 'setIsCompareActive'
> & {
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
};

export const TanStackCompareDocuments = ({
  consumer,
  ariaLabelledBy,
  dataView,
  columnsMeta,
  isPlainRecord,
  selectedFieldNames,
  selectedDocIds: initialSelectedDocIds,
  forceShowAllFields,
  fieldFormats,
  docMap: initialDocMap,
  replaceSelectedDocs: replaceSelectedDocsInGrid,
  setIsCompareActive,
  showFullScreenButton,
  isFullScreen,
  onToggleFullScreen,
}: ComparisonProps) => {
  const { euiTheme } = useEuiTheme();
  // Keep the comparison stable while Discover refreshes its result set.
  const [docMap] = useState<DocMap>(initialDocMap);
  const [selectedDocIds, setSelectedDocIds] = useState(initialSelectedDocIds);
  const replaceSelectedDocs = useCallback(
    (ids: string[]) => {
      setSelectedDocIds(ids);
      replaceSelectedDocsInGrid(ids);
    },
    [replaceSelectedDocsInGrid]
  );
  const getStorageKey = (key: string) => `${consumer}:dataGridComparison${key}`;
  const [showDiff, setShowDiff] = useRestorableLocalStorage(
    'comparisonSettingShowDiff',
    getStorageKey('ShowDiff'),
    true
  );
  const [diffMode, setDiffMode] = useRestorableLocalStorage(
    'comparisonSettingDiffMode',
    getStorageKey('DiffMode'),
    'basic'
  );
  const [showDiffDecorations, setShowDiffDecorations] = useRestorableLocalStorage(
    'comparisonSettingShowDiffDecorations',
    getStorageKey('ShowDiffDecorations'),
    true
  );
  const [showAllFields, setShowAllFields] = useRestorableLocalStorage(
    'comparisonSettingShowAllFields',
    getStorageKey('ShowAllFields'),
    false
  );
  const [showMatchingValues, setShowMatchingValues] = useRestorableLocalStorage(
    'comparisonSettingShowMatchingValues',
    getStorageKey('ShowMatchingValues'),
    true
  );
  const { comparisonFields, totalFields } = useComparisonFields({
    dataView,
    columnsMeta,
    selectedFieldNames,
    selectedDocIds,
    showAllFields: forceShowAllFields || showAllFields,
    showMatchingValues,
    docMap,
  });
  return (
    <div
      css={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      data-test-subj="unifiedDataTableCompareDocuments"
    >
      <div css={{ padding: euiTheme.size.s }}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <ComparisonControls
              isPlainRecord={isPlainRecord}
              selectedDocIds={selectedDocIds}
              showDiff={showDiff}
              diffMode={diffMode}
              showDiffDecorations={showDiffDecorations}
              showMatchingValues={showMatchingValues}
              showAllFields={showAllFields}
              forceShowAllFields={forceShowAllFields}
              setIsCompareActive={setIsCompareActive}
              setShowDiff={setShowDiff}
              setDiffMode={setDiffMode}
              setShowDiffDecorations={setShowDiffDecorations}
              setShowMatchingValues={setShowMatchingValues}
              setShowAllFields={setShowAllFields}
            />
          </EuiFlexItem>
          {showFullScreenButton && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                disableScreenReaderOutput
                content={i18n.translate('discover.grid.tanStack.comparisonFullScreenButtonLabel', {
                  defaultMessage: 'Toggle full screen',
                })}
              >
                <EuiButtonIcon
                  iconType={isFullScreen ? 'fullScreenExit' : 'fullScreen'}
                  aria-label={i18n.translate(
                    'discover.grid.tanStack.comparisonFullScreenButtonLabel',
                    {
                      defaultMessage: 'Toggle full screen',
                    }
                  )}
                  onClick={onToggleFullScreen}
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {totalFields > comparisonFields.length && (
          <div css={{ paddingTop: euiTheme.size.xs }}>
            {i18n.translate('discover.grid.tanStack.comparisonMaxFieldsDescription', {
              defaultMessage:
                'Comparison is limited to {comparisonFields} of {totalFields} fields.',
              values: { comparisonFields: comparisonFields.length, totalFields },
            })}
          </div>
        )}
      </div>
      <TanStackComparisonTable
        ariaLabelledBy={ariaLabelledBy}
        dataView={dataView}
        columnsMeta={columnsMeta}
        fieldFormats={fieldFormats}
        comparisonFields={comparisonFields}
        selectedDocIds={selectedDocIds}
        docMap={docMap}
        showDiff={showDiff}
        diffMode={diffMode}
        showDiffDecorations={showDiffDecorations}
        replaceSelectedDocs={replaceSelectedDocs}
      />
    </div>
  );
};
