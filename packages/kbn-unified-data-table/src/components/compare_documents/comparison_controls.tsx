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
  EuiLink,
  EuiPopover,
  EuiSwitch,
  EuiSwitchProps,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiBackgroundColor,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DocumentDiffMode } from './types';
import type { UnifiedDataTableRenderCustomToolbar } from '../data_table';

export interface ComparisonControlsProps {
  selectedDocs: string[];
  showDiff: boolean | undefined;
  diffMode: DocumentDiffMode | undefined;
  showDiffDecorations: boolean | undefined;
  showAllFields: boolean | undefined;
  forceShowAllFields: boolean;
  setIsCompareActive: (isCompareActive: boolean) => void;
  setShowDiff: (showDiff: boolean) => void;
  setDiffMode: (diffMode: DocumentDiffMode) => void;
  setShowDiffDecorations: (showDiffDecorations: boolean) => void;
  setShowAllFields: (showAllFields: boolean) => void;
  renderCustomToolbar?: UnifiedDataTableRenderCustomToolbar;
}

export const ComparisonControls = ({
  selectedDocs,
  showDiff,
  diffMode,
  showDiffDecorations,
  showAllFields,
  forceShowAllFields,
  setIsCompareActive,
  setShowDiff,
  setDiffMode,
  setShowDiffDecorations,
  setShowAllFields,
  renderCustomToolbar,
}: ComparisonControlsProps) => {
  const { euiTheme } = useEuiTheme();
  const backgroundSuccess = useEuiBackgroundColor('success');

  return (
    <EuiFlexGroup
      responsive={false}
      gutterSize="s"
      alignItems="center"
      css={renderCustomToolbar ? undefined : { padding: `0 ${euiTheme.size.s}` }}
    >
      <EuiFlexItem grow={false} css={{ marginRight: euiTheme.size.s }}>
        <EuiText size="s">
          <strong>
            <FormattedMessage
              id="unifiedDataTable.comparingDocuments"
              defaultMessage="Comparing {documentCount} documents"
              values={{ documentCount: selectedDocs.length }}
            />
          </strong>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiDataGridToolbarControl
          iconType="diff"
          color={showDiff ? 'success' : 'text'}
          isSelected={showDiff}
          onClick={() => {
            setShowDiff(!showDiff);
          }}
          css={{
            backgroundColor: showDiff ? `${backgroundSuccess} !important` : undefined,
            borderColor: showDiff ? `${backgroundSuccess} !important` : undefined,
          }}
        >
          <FormattedMessage id="unifiedDataTable.showDiff" defaultMessage="Show diff" />
        </EuiDataGridToolbarControl>
      </EuiFlexItem>

      {showDiff && (
        <EuiFlexItem grow={false}>
          <DiffOptions
            diffMode={diffMode}
            showDiffDecorations={showDiffDecorations}
            showAllFields={showAllFields}
            forceShowAllFields={forceShowAllFields}
            setDiffMode={setDiffMode}
            setShowDiffDecorations={setShowDiffDecorations}
            setShowAllFields={setShowAllFields}
          />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiDataGridToolbarControl
          iconType="exit"
          onClick={() => {
            setIsCompareActive(false);
          }}
          data-test-subj="unifiedFieldListCloseComparison"
        >
          <FormattedMessage
            id="unifiedDataTable.closeDocumentComparison"
            defaultMessage="Exit comparison mode"
          />
        </EuiDataGridToolbarControl>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const DiffOptions = ({
  diffMode,
  showDiffDecorations,
  showAllFields,
  forceShowAllFields,
  setDiffMode,
  setShowDiffDecorations,
  setShowAllFields,
}: Pick<
  ComparisonControlsProps,
  | 'diffMode'
  | 'setDiffMode'
  | 'showDiffDecorations'
  | 'showAllFields'
  | 'forceShowAllFields'
  | 'setShowDiffDecorations'
  | 'setShowAllFields'
>) => {
  const [isDiffOptionsMenuOpen, setIsDiffOptionsMenuOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiDataGridToolbarControl
          iconType="gear"
          onClick={() => {
            setIsDiffOptionsMenuOpen(!isDiffOptionsMenuOpen);
          }}
        >
          <FormattedMessage id="unifiedDataTable.diffSettings" defaultMessage="Diff settings" />
        </EuiDataGridToolbarControl>
      }
      isOpen={isDiffOptionsMenuOpen}
      closePopover={() => {
        setIsDiffOptionsMenuOpen(false);
      }}
      panelPaddingSize="none"
      anchorPosition="downCenter"
    >
      <EuiContextMenuPanel
        size="s"
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

        <EuiHorizontalRule margin="none" />

        <SectionHeader>
          <FormattedMessage id="unifiedDataTable.diffOptions" defaultMessage="Options" />
        </SectionHeader>

        {!forceShowAllFields && (
          <DiffOptionSwitch
            label={i18n.translate('unifiedDataTable.showAllFields', {
              defaultMessage: 'Show all fields',
            })}
            checked={showAllFields ?? false}
            onChange={(e) => {
              setShowAllFields(e.target.checked);
            }}
            itemCss={{ paddingBottom: 0 }}
          />
        )}

        <DiffOptionSwitch
          label={i18n.translate('unifiedDataTable.showDiffDecorations', {
            defaultMessage: 'Show decorations',
          })}
          checked={showDiffDecorations ?? true}
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
    advanced?: boolean;
    entryDiffMode: DocumentDiffMode;
  }
> = ({ children, entryDiffMode, diffMode, advanced, setDiffMode }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiContextMenuItem
      key={entryDiffMode}
      icon={diffMode === entryDiffMode ? 'check' : 'empty'}
      size="s"
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
  checked,
  onChange,
  itemCss,
}: Pick<EuiSwitchProps, 'label' | 'checked' | 'onChange'> & {
  itemCss?: EuiContextMenuItemProps['css'];
}) => {
  return (
    <EuiContextMenuItem size="s" css={itemCss}>
      <EuiSwitch label={label} checked={checked} compressed onChange={onChange} />
    </EuiContextMenuItem>
  );
};
