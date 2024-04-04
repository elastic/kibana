/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiBadge,
  EuiContextMenuItem,
  EuiContextMenuItemProps,
  EuiContextMenuPanel,
  EuiDataGridToolbarControl,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiLink,
  EuiPopover,
  EuiSwitch,
  EuiSwitchProps,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DocumentDiffMode } from './types';

export interface ComparisonControlsProps {
  isPlainRecord?: boolean;
  selectedDocs: string[];
  diffMode: DocumentDiffMode | undefined;
  showDiffDecorations: boolean | undefined;
  showMatchingValues: boolean | undefined;
  showAllFields: boolean | undefined;
  forceShowAllFields: boolean;
  setIsCompareActive: (isCompareActive: boolean) => void;
  setDiffMode: (diffMode: DocumentDiffMode) => void;
  setShowDiffDecorations: (showDiffDecorations: boolean) => void;
  setShowMatchingValues: (showMatchingValues: boolean) => void;
  setShowAllFields: (showAllFields: boolean) => void;
}

export const ComparisonControls = ({
  isPlainRecord,
  selectedDocs,
  diffMode,
  showDiffDecorations,
  showMatchingValues,
  showAllFields,
  forceShowAllFields,
  setIsCompareActive,
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
          diffMode={diffMode}
          showDiffDecorations={showDiffDecorations}
          showMatchingValues={showMatchingValues}
          showAllFields={showAllFields}
          forceShowAllFields={forceShowAllFields}
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

const ComparisonSettings = ({
  diffMode,
  showDiffDecorations,
  showMatchingValues,
  showAllFields,
  forceShowAllFields,
  setDiffMode,
  setShowDiffDecorations,
  setShowMatchingValues,
  setShowAllFields,
}: Pick<
  ComparisonControlsProps,
  | 'diffMode'
  | 'setDiffMode'
  | 'showDiffDecorations'
  | 'showMatchingValues'
  | 'showAllFields'
  | 'forceShowAllFields'
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
        <SectionHeader>
          <FormattedMessage id="unifiedDataTable.diffMode" defaultMessage="Diff mode" />
        </SectionHeader>

        <DiffModeEntry entryDiffMode="basic" diffMode={diffMode} setDiffMode={setDiffMode}>
          <FormattedMessage id="unifiedDataTable.diffModeBasic" defaultMessage="Full value" />
        </DiffModeEntry>

        <DiffModeEntry entryDiffMode="chars" diffMode={diffMode} setDiffMode={setDiffMode} advanced>
          <FormattedMessage id="unifiedDataTable.diffModeChars" defaultMessage="By character" />
        </DiffModeEntry>

        <DiffModeEntry entryDiffMode="words" diffMode={diffMode} setDiffMode={setDiffMode} advanced>
          <FormattedMessage id="unifiedDataTable.diffModeWords" defaultMessage="By word" />
        </DiffModeEntry>

        <DiffModeEntry entryDiffMode="lines" diffMode={diffMode} setDiffMode={setDiffMode} advanced>
          <FormattedMessage id="unifiedDataTable.diffModeLines" defaultMessage="By line" />
        </DiffModeEntry>

        <DiffModeEntry entryDiffMode={null} diffMode={diffMode} setDiffMode={setDiffMode}>
          <FormattedMessage id="unifiedDataTable.diffModeNone" defaultMessage="None" />
        </DiffModeEntry>

        <EuiHorizontalRule margin="none" />

        <SectionHeader>
          <FormattedMessage id="unifiedDataTable.diffOptions" defaultMessage="Options" />
        </SectionHeader>

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
          data-test-subj="showDiffDecorations"
          onChange={(e) => {
            setShowDiffDecorations(e.target.checked);
          }}
        />
      </EuiContextMenuPanel>
    </EuiPopover>
  );
};

const SectionHeader: FC = ({ children }) => {
  return (
    <EuiContextMenuItem size="s" css={{ paddingBottom: 0 }}>
      <EuiTitle size="xxs">
        <h3>{children}</h3>
      </EuiTitle>
    </EuiContextMenuItem>
  );
};

const DiffModeEntry: FC<
  Pick<ComparisonControlsProps, 'diffMode' | 'setDiffMode'> & {
    entryDiffMode: DocumentDiffMode;
    advanced?: boolean;
  }
> = ({ children, entryDiffMode, diffMode, advanced, setDiffMode }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiContextMenuItem
      key={entryDiffMode}
      icon={diffMode === entryDiffMode ? 'check' : 'empty'}
      size="s"
      aria-current={diffMode === entryDiffMode}
      data-test-subj={`unifiedFieldListDiffMode-${entryDiffMode ?? 'none'}`}
      css={{ paddingTop: 0, paddingBottom: 0 }}
    >
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem>
          <EuiLink
            color="text"
            onClick={() => {
              setDiffMode(entryDiffMode);
            }}
            css={{ padding: `${euiTheme.size.s} 0`, fontWeight: euiTheme.font.weight.regular }}
          >
            {children}
          </EuiLink>
        </EuiFlexItem>
        {advanced && (
          <EuiFlexItem grow={false}>
            <AdvancedModeBadge />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiContextMenuItem>
  );
};

const AdvancedModeBadge = () => {
  return (
    <EuiToolTip
      position="right"
      content={i18n.translate('unifiedDataTable.advancedDiffModesTooltip', {
        defaultMessage:
          'Advanced modes offer enhanced diffing capabilities, but operate ' +
          'on raw documents and therefore do not support field formatting.',
      })}
    >
      <EuiBadge color="hollow" tabIndex={0} title="">
        <FormattedMessage id="unifiedDataTable.advancedDiffModes" defaultMessage="Advanced" />
      </EuiBadge>
    </EuiToolTip>
  );
};

const DiffOptionSwitch = ({
  label,
  description,
  checked,
  onChange,
  ['data-test-subj']: dataTestSubj,
  itemCss,
}: Pick<EuiSwitchProps, 'label' | 'checked' | 'onChange'> & {
  description?: string;
  ['data-test-subj']: string;
  itemCss?: EuiContextMenuItemProps['css'];
}) => {
  return (
    <EuiContextMenuItem size="s" css={itemCss}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={label}
            checked={checked}
            compressed
            onChange={onChange}
            data-test-subj={`unifiedFieldListDiffOptionSwitch-${dataTestSubj}`}
          />
        </EuiFlexItem>
        {description && (
          <EuiFlexItem grow={false}>
            <EuiIconTip type="questionInCircle" position="right" content={description} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiContextMenuItem>
  );
};
