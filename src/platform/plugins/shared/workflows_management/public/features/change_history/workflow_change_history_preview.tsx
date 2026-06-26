/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useMemo, useState } from 'react';
import type { ChangeHistoryDetail, ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';
import { useChangeHistoryConfig } from '@kbn/change-history-ui';

import * as i18n from './translations';
import { WorkflowChangeHistoryMonacoDiff } from './workflow_change_history_monaco_diff';

type CompareTarget = 'previous' | 'current';

const getWorkflowYamlFromSnapshot = (snapshot: unknown): string => {
  if (!snapshot || typeof snapshot !== 'object') {
    return '';
  }

  const workflow = (snapshot as { workflow?: { yaml?: unknown } }).workflow;

  return typeof workflow?.yaml === 'string' ? workflow.yaml : '';
};

const getDefaultCompareTarget = (
  change: ChangeHistoryDetail,
  supportsRestore: boolean
): CompareTarget => {
  if (supportsRestore && !change.isCurrent) {
    return 'current';
  }

  return 'previous';
};

const WorkflowChangeHistoryPreviewContent = ({
  change,
  currentChange,
  previousChange,
  isLoadingCompareContext = false,
}: {
  change: ChangeHistoryDetail;
  currentChange?: ChangeHistoryDetail;
  previousChange?: ChangeHistoryDetail;
  isLoadingCompareContext?: boolean;
}): JSX.Element => {
  const { supports } = useChangeHistoryConfig();
  const [isCompareSettingsOpen, setIsCompareSettingsOpen] = useState(false);
  const [compareTarget, setCompareTarget] = useState<CompareTarget>(() =>
    getDefaultCompareTarget(change, supports.restore)
  );
  const compareSettingsPopoverId = useGeneratedHtmlId({
    prefix: 'workflowChangeHistoryCompareSettings',
  });

  useEffect(() => {
    setCompareTarget(getDefaultCompareTarget(change, supports.restore));
  }, [change, change.id, change.isCurrent, supports.restore]);

  const selectedYaml = getWorkflowYamlFromSnapshot(change.snapshot);

  const comparePair = useMemo(() => {
    if (compareTarget === 'current' && currentChange && !change.isCurrent) {
      return {
        originalYaml: selectedYaml,
        modifiedYaml: getWorkflowYamlFromSnapshot(currentChange.snapshot),
      };
    }

    if (compareTarget === 'previous' && previousChange) {
      return {
        originalYaml: getWorkflowYamlFromSnapshot(previousChange.snapshot),
        modifiedYaml: selectedYaml,
      };
    }

    return undefined;
  }, [change.isCurrent, compareTarget, currentChange, previousChange, selectedYaml]);

  const canCompareToCurrent = supports.restore && !change.isCurrent && Boolean(currentChange);
  const canCompareToPrevious = Boolean(previousChange);
  const showCompareSettings = canCompareToCurrent || canCompareToPrevious;

  const compareOptions = useMemo(
    () => [
      {
        label: i18n.COMPARE_TO_PREVIOUS_VERSION,
        checked: compareTarget === 'previous' ? ('on' as const) : undefined,
        disabled: !canCompareToPrevious,
      },
      {
        label: i18n.COMPARE_TO_CURRENT_VERSION,
        checked: compareTarget === 'current' ? ('on' as const) : undefined,
        disabled: !canCompareToCurrent,
      },
    ],
    [canCompareToCurrent, canCompareToPrevious, compareTarget]
  );

  const showDiff = comparePair != null && comparePair.originalYaml !== comparePair.modifiedYaml;

  return (
    <EuiFlexGroup
      direction="column"
      css={css`
        height: 100%;
        min-height: 0;
        box-sizing: border-box;
      `}
      gutterSize="s"
    >
      {showCompareSettings ? (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiPopover
                id={compareSettingsPopoverId}
                button={
                  <EuiToolTip content={i18n.COMPARE_SETTINGS_ARIA_LABEL} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="gear"
                      aria-label={i18n.COMPARE_SETTINGS_ARIA_LABEL}
                      data-test-subj="workflowChangeHistoryCompareSettings"
                      onClick={() => setIsCompareSettingsOpen((open) => !open)}
                    />
                  </EuiToolTip>
                }
                isOpen={isCompareSettingsOpen}
                closePopover={() => setIsCompareSettingsOpen(false)}
                panelPaddingSize="s"
                anchorPosition="downRight"
              >
                <EuiPopoverTitle paddingSize="s">{i18n.COMPARE_SETTINGS_TITLE}</EuiPopoverTitle>
                <EuiSelectable
                  options={compareOptions}
                  singleSelection
                  onChange={(newOptions) => {
                    const selectedIndex = newOptions.findIndex((option) => option.checked === 'on');
                    if (selectedIndex === 0 && canCompareToPrevious) {
                      setCompareTarget('previous');
                      setIsCompareSettingsOpen(false);
                      return;
                    }

                    if (selectedIndex === 1 && canCompareToCurrent) {
                      setCompareTarget('current');
                      setIsCompareSettingsOpen(false);
                    }
                  }}
                >
                  {(list) => list}
                </EuiSelectable>
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}

      <EuiFlexItem
        css={css`
          min-height: 0;
        `}
      >
        {isLoadingCompareContext && !comparePair ? (
          <EuiFlexGroup alignItems="center" justifyContent="center" css={css({ height: '100%' })}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : showDiff && comparePair ? (
          <WorkflowChangeHistoryMonacoDiff
            originalYaml={comparePair.originalYaml}
            modifiedYaml={comparePair.modifiedYaml}
          />
        ) : (
          <EuiCodeBlock
            language="yaml"
            isCopyable
            paddingSize="none"
            css={css`
              height: 100%;
            `}
            data-test-subj="workflowChangeHistoryYamlPreview"
          >
            {selectedYaml}
          </EuiCodeBlock>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const renderWorkflowChangeHistoryPreview: ChangeHistoryPreviewRenderFn = ({
  change,
  currentChange,
  previousChange,
  isLoadingCompareContext,
}) => (
  <WorkflowChangeHistoryPreviewContent
    change={change}
    currentChange={currentChange}
    previousChange={previousChange}
    isLoadingCompareContext={isLoadingCompareContext}
  />
);
