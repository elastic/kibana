/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiContextMenuItem,
  EuiContextMenuItemProps,
  EuiContextMenuPanel,
  EuiDataGridToolbarControl,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPopover,
  EuiSwitch,
  EuiSwitchProps,
  EuiText,
  EuiTitle,
  EuiTitleSize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC, ReactNode, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DocumentDiffMode } from './types';

export interface ComparisonControlsProps {
  isPlainRecord?: boolean;
  selectedDocs: string[];
  showDiff: boolean | undefined;
  diffMode: DocumentDiffMode | undefined;
  showDiffDecorations: boolean | undefined;
  showMatchingValues: boolean | undefined;
  showAllFields: boolean | undefined;
  forceShowAllFields: boolean;
  setIsCompareActive: (isCompareActive: boolean) => void;
  setShowDiff: (showDiff: boolean) => void;
  setDiffMode: (diffMode: DocumentDiffMode) => void;
  setShowDiffDecorations: (showDiffDecorations: boolean) => void;
  setShowMatchingValues: (showMatchingValues: boolean) => void;
  setShowAllFields: (showAllFields: boolean) => void;
}

export const ComparisonControls = ({
  isPlainRecord,
  selectedDocs,
  showDiff,
  diffMode,
  showDiffDecorations,
  showMatchingValues,
  showAllFields,
  forceShowAllFields,
  setIsCompareActive,
  setShowDiff,
  setDiffMode,
  setShowDiffDecorations,
  setShowMatchingValues,
  setShowAllFields,
}: ComparisonControlsProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup responsive={false} wrap={true} gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false} css={{ marginRight: euiTheme.size.s }}>
        <EuiText size="s">
          <strong data-test-subj="unifiedDataTableComparisonDisplay">
            {isPlainRecord ? (
              <FormattedMessage
                id="unifiedDataTable.comparingResults"
                defaultMessage="Comparing {documentCount} results"
                values={{ documentCount: selectedDocs.length }}
              />
            ) : (
              <FormattedMessage
                id="unifiedDataTable.comparingDocuments"
                defaultMessage="Comparing {documentCount} documents"
                values={{ documentCount: selectedDocs.length }}
              />
            )}
          </strong>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <ComparisonSettings
          showDiff={showDiff}
          diffMode={diffMode}
          showDiffDecorations={showDiffDecorations}
          showMatchingValues={showMatchingValues}
          showAllFields={showAllFields}
          forceShowAllFields={forceShowAllFields}
          setShowDiff={setShowDiff}
          setDiffMode={setDiffMode}
          setShowDiffDecorations={setShowDiffDecorations}
          setShowMatchingValues={setShowMatchingValues}
          setShowAllFields={setShowAllFields}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <div className="unifiedDataTableToolbarControlButton">
          <EuiDataGridToolbarControl
            iconType="exit"
            onClick={() => {
              setIsCompareActive(false);
            }}
            data-test-subj="unifiedDataTableExitDocumentComparison"
          >
            <FormattedMessage
              id="unifiedDataTable.exitDocumentComparison"
              defaultMessage="Exit comparison mode"
            />
          </EuiDataGridToolbarControl>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const showDiffLabel = i18n.translate('unifiedDataTable.showDiff', {
  defaultMessage: 'Show diff',
});

const ComparisonSettings = ({
  showDiff,
  diffMode,
  showDiffDecorations,
  showMatchingValues,
  showAllFields,
  forceShowAllFields,
  setShowDiff,
  setDiffMode,
  setShowDiffDecorations,
  setShowMatchingValues,
  setShowAllFields,
}: Pick<
  ComparisonControlsProps,
  | 'showDiff'
  | 'diffMode'
  | 'showDiffDecorations'
  | 'showMatchingValues'
  | 'showAllFields'
  | 'forceShowAllFields'
  | 'setShowDiff'
  | 'setDiffMode'
  | 'setShowDiffDecorations'
  | 'setShowMatchingValues'
  | 'setShowAllFields'
>) => {
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <div className="unifiedDataTableToolbarControlButton">
          <EuiDataGridToolbarControl
            iconType="gear"
            onClick={() => {
              setIsSettingsMenuOpen(!isSettingsMenuOpen);
            }}
            data-test-subj="unifiedDataTableComparisonSettings"
          >
            <FormattedMessage
              id="unifiedDataTable.comparisonSettings"
              defaultMessage="Comparison settings"
            />
          </EuiDataGridToolbarControl>
        </div>
      }
      isOpen={isSettingsMenuOpen}
      closePopover={() => {
        setIsSettingsMenuOpen(false);
      }}
      panelPaddingSize="none"
      anchorPosition="downCenter"
    >
      <EuiContextMenuPanel
        size="s"
        data-test-subj="unifiedDataTableComparisonSettingsMenu"
        css={{
          '.euiContextMenuItem__text': {
            overflow: 'visible',
          },
        }}
      >
        <SectionHeader
          title={showDiffLabel}
          append={
            <EuiSwitch
              label={showDiffLabel}
              showLabel={false}
              checked={Boolean(showDiff)}
              compressed
              onChange={(e) => {
                setShowDiff(e.target.checked);
              }}
              data-test-subj="unifiedDataTableShowDiffSwitch"
            />
          }
        />

        <SectionHeader
          title={<FormattedMessage id="unifiedDataTable.diffModesBasic" defaultMessage="Basic" />}
          type="subsection"
        />

        <DiffModeEntry
          entryDiffMode="basic"
          diffMode={diffMode}
          setDiffMode={setDiffMode}
          disabled={!showDiff}
        >
          <FormattedMessage id="unifiedDataTable.diffModeFullValue" defaultMessage="Full value" />
        </DiffModeEntry>

        <SectionHeader
          title={
            <FormattedMessage id="unifiedDataTable.diffModesAdvanced" defaultMessage="Advanced" />
          }
          description={
            <FormattedMessage
              id="unifiedDataTable.advancedDiffModesTooltip"
              defaultMessage="Advanced modes offer enhanced diffing capabilities, but operate on raw documents and therefore do not support field formatting."
            />
          }
          type="subsection"
          noPadding
        />

        <DiffModeEntry
          entryDiffMode="chars"
          diffMode={diffMode}
          setDiffMode={setDiffMode}
          disabled={!showDiff}
        >
          <FormattedMessage id="unifiedDataTable.diffModeChars" defaultMessage="By character" />
        </DiffModeEntry>

        <DiffModeEntry
          entryDiffMode="words"
          diffMode={diffMode}
          setDiffMode={setDiffMode}
          disabled={!showDiff}
        >
          <FormattedMessage id="unifiedDataTable.diffModeWords" defaultMessage="By word" />
        </DiffModeEntry>

        <DiffModeEntry
          entryDiffMode="lines"
          diffMode={diffMode}
          setDiffMode={setDiffMode}
          disabled={!showDiff}
        >
          <FormattedMessage id="unifiedDataTable.diffModeLines" defaultMessage="By line" />
        </DiffModeEntry>

        <EuiHorizontalRule margin="none" />

        <SectionHeader
          title={<FormattedMessage id="unifiedDataTable.diffOptions" defaultMessage="Options" />}
        />

        {!forceShowAllFields && (
          <DiffOptionSwitch
            label={i18n.translate('unifiedDataTable.showAllFields', {
              defaultMessage: 'Show full field list',
            })}
            description={i18n.translate('unifiedDataTable.showAllFieldsDescription', {
              defaultMessage:
                'Show all available fields if enabled, otherwise only fields with columns in the main table.',
            })}
            checked={showAllFields ?? false}
            onChange={(e) => {
              setShowAllFields(e.target.checked);
            }}
            data-test-subj="showAllFields"
            itemCss={{ paddingBottom: 0 }}
          />
        )}

        <DiffOptionSwitch
          label={i18n.translate('unifiedDataTable.showMatchingValues', {
            defaultMessage: 'Show matching fields',
          })}
          description={i18n.translate('unifiedDataTable.showMatchingValuesDescription', {
            defaultMessage:
              'Show fields where all values are equal if enabled, otherwise only fields with differences.',
          })}
          checked={showMatchingValues ?? true}
          onChange={(e) => {
            setShowMatchingValues(e.target.checked);
          }}
          data-test-subj="showMatchingValues"
          itemCss={{ paddingBottom: 0 }}
        />

        <DiffOptionSwitch
          label={i18n.translate('unifiedDataTable.showDiffDecorations', {
            defaultMessage: 'Show diff decorations',
          })}
          description={i18n.translate('unifiedDataTable.showDiffDecorationsDescription', {
            defaultMessage:
              'Show text decorations in diffs if enabled, otherwise only use highlighting.',
          })}
          checked={showDiffDecorations ?? true}
          disabled={!showDiff}
          data-test-subj="showDiffDecorations"
          onChange={(e) => {
            setShowDiffDecorations(e.target.checked);
          }}
        />
      </EuiContextMenuPanel>
    </EuiPopover>
  );
};

const SectionHeader = ({
  title,
  description,
  type = 'section',
  noPadding,
  append,
}: {
  title: ReactNode;
  description?: ReactNode;
  type?: 'section' | 'subsection';
  noPadding?: boolean;
  append?: ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  const size: EuiTitleSize = type === 'section' ? 'xxs' : 'xxxs';
  const HeadingTag = type === 'section' ? 'h3' : 'h4';

  return (
    <EuiContextMenuItem
      size="s"
      css={[
        noPadding && { paddingTop: 0 },
        { paddingBottom: 0 },
        type === 'subsection' && { paddingLeft: `calc(${euiTheme.size.m} + ${euiTheme.size.xxs})` },
      ]}
    >
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size={size}>
              <HeadingTag>{title}</HeadingTag>
            </EuiTitle>
          </EuiFlexItem>
          {description && (
            <EuiFlexItem grow={false} css={{ lineHeight: 0 }}>
              <EuiIconTip type="questionInCircle" position="right" content={description} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {append && <EuiFlexItem grow={false}>{append}</EuiFlexItem>}
      </EuiFlexGroup>
    </EuiContextMenuItem>
  );
};

const enableShowDiffTooltip = i18n.translate('unifiedDataTable.enableShowDiff', {
  defaultMessage: 'You need to enable Show diff',
});

const DiffModeEntry: FC<
  Pick<ComparisonControlsProps, 'diffMode' | 'setDiffMode'> & {
    entryDiffMode: DocumentDiffMode;
    disabled?: boolean;
  }
> = ({ children, entryDiffMode, diffMode, disabled, setDiffMode }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiContextMenuItem
      key={entryDiffMode}
      icon={diffMode === entryDiffMode ? 'check' : 'empty'}
      size="s"
      aria-current={diffMode === entryDiffMode}
      disabled={disabled}
      toolTipContent={disabled ? enableShowDiffTooltip : undefined}
      onClick={() => {
        setDiffMode(entryDiffMode);
      }}
      data-test-subj={`unifiedDataTableDiffMode-${entryDiffMode}`}
      css={{ paddingLeft: `calc(${euiTheme.size.m} + ${euiTheme.size.xxs})` }}
    >
      {children}
    </EuiContextMenuItem>
  );
};

const DiffOptionSwitch = ({
  label,
  description,
  checked,
  disabled,
  onChange,
  ['data-test-subj']: dataTestSubj,
  itemCss,
}: Pick<EuiSwitchProps, 'label' | 'checked' | 'onChange'> & {
  description?: string;
  disabled?: boolean;
  ['data-test-subj']: string;
  itemCss?: EuiContextMenuItemProps['css'];
}) => {
  return (
    <EuiContextMenuItem
      size="s"
      disabled={disabled}
      toolTipContent={disabled ? enableShowDiffTooltip : undefined}
      css={itemCss}
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={label}
            checked={checked}
            compressed
            disabled={disabled}
            onChange={onChange}
            data-test-subj={`unifiedDataTableDiffOptionSwitch-${dataTestSubj}`}
          />
        </EuiFlexItem>
        {description && (
          <EuiFlexItem grow={false} css={{ lineHeight: 0 }}>
            <EuiIconTip
              type="questionInCircle"
              position="right"
              content={description}
              iconProps={disabled ? { tabIndex: -1 } : undefined}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiContextMenuItem>
  );
};
