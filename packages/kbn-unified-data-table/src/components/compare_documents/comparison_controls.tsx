/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSwitch,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import classNames from 'classnames';
import type { DocumentDiffMode } from './types';

export interface ComparisonControlsProps {
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
}

export const ComparisonControls = ({
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
}: ComparisonControlsProps) => {
  return (
    <>
      <EuiButtonEmpty
        size="xs"
        color="text"
        iconType="cross"
        onClick={() => {
          setIsCompareActive(false);
        }}
        data-test-subj="unifiedFieldListCloseComparison"
        className={classNames({
          // eslint-disable-next-line @typescript-eslint/naming-convention
          euiDataGrid__controlBtn: true,
        })}
      >
        <FormattedMessage
          id="unifiedDataTable.closeDocumentComparison"
          defaultMessage="Stop comparing documents"
        />
      </EuiButtonEmpty>

      <EuiSwitch
        label={i18n.translate('unifiedDataTable.showDiff', {
          defaultMessage: 'Show diff',
        })}
        checked={showDiff ?? true}
        labelProps={{
          css: css`
            font-size: ${euiThemeVars.euiFontSizeXS} !important;
            font-weight: ${euiThemeVars.euiFontWeightMedium};
          `,
        }}
        compressed
        css={css`
          padding-left: ${euiThemeVars.euiSizeXS};
        `}
        onChange={(e) => {
          setShowDiff(e.target.checked);
        }}
      />

      <DiffOptions
        showDiff={showDiff}
        diffMode={diffMode}
        showDiffDecorations={showDiffDecorations}
        setDiffMode={setDiffMode}
        setShowDiffDecorations={setShowDiffDecorations}
      />

      {!forceShowAllFields && (
        <EuiSwitch
          label={i18n.translate('unifiedDataTable.showAllFields', {
            defaultMessage: 'Show all fields',
          })}
          checked={showAllFields ?? false}
          labelProps={{
            css: css`
              font-size: ${euiThemeVars.euiFontSizeXS} !important;
              font-weight: ${euiThemeVars.euiFontWeightMedium};
            `,
          }}
          compressed
          css={css`
            padding-left: ${euiThemeVars.euiSizeM};
          `}
          onChange={(e) => {
            setShowAllFields(e.target.checked);
          }}
        />
      )}
    </>
  );
};

const DiffOptions = ({
  showDiff,
  diffMode,
  showDiffDecorations,
  setDiffMode,
  setShowDiffDecorations,
}: Pick<
  ComparisonControlsProps,
  'showDiff' | 'diffMode' | 'setDiffMode' | 'showDiffDecorations' | 'setShowDiffDecorations'
>) => {
  const [isDiffOptionsMenuOpen, setIsDiffOptionsMenuOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiToolTip
          position="top"
          delay="long"
          content={i18n.translate('unifiedDataTable.diffOptionsTooltip', {
            defaultMessage: 'Diff options',
          })}
        >
          <EuiButtonIcon
            iconType="arrowDown"
            size="xs"
            iconSize="s"
            color="text"
            disabled={!showDiff}
            aria-label={
              isDiffOptionsMenuOpen
                ? i18n.translate('unifiedDataTable.closeDiffOptions', {
                    defaultMessage: 'Close diff options',
                  })
                : i18n.translate('unifiedDataTable.openDiffOptions', {
                    defaultMessage: 'Open diff options',
                  })
            }
            onClick={() => {
              setIsDiffOptionsMenuOpen(!isDiffOptionsMenuOpen);
            }}
          />
        </EuiToolTip>
      }
      isOpen={isDiffOptionsMenuOpen}
      closePopover={() => {
        setIsDiffOptionsMenuOpen(false);
      }}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel size="s">
        <EuiPanel
          color="transparent"
          paddingSize="s"
          css={css`
            padding-bottom: 0;
          `}
        >
          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage id="unifiedDataTable.diffMode" defaultMessage="Diff mode" />
            </h3>
          </EuiTitle>
        </EuiPanel>

        <EuiContextMenuItem
          key="basic"
          icon={diffMode === 'basic' ? 'check' : 'empty'}
          size="s"
          onClick={() => {
            setDiffMode('basic');
          }}
        >
          <FormattedMessage id="unifiedDataTable.diffModeBasic" defaultMessage="Full value" />
        </EuiContextMenuItem>

        <EuiHorizontalRule margin="none" />

        <EuiPanel
          color="transparent"
          paddingSize="s"
          css={css`
            padding-bottom: 0;
          `}
        >
          <EuiTitle size="xxxs">
            <h4>
              <FormattedMessage
                id="unifiedDataTable.advancedDiffModes"
                defaultMessage="Advanced modes"
              />{' '}
              <EuiToolTip
                position="top"
                content={i18n.translate('unifiedDataTable.advancedDiffModesTooltip', {
                  defaultMessage:
                    'Advanced modes offer enhanced diffing capabilities, but operate ' +
                    'on raw documents and therefore do not support field formatting.',
                })}
              >
                <EuiIcon type="questionInCircle" />
              </EuiToolTip>
            </h4>
          </EuiTitle>
        </EuiPanel>

        <EuiContextMenuItem
          key="chars"
          icon={diffMode === 'chars' ? 'check' : 'empty'}
          size="s"
          onClick={() => {
            setDiffMode('chars');
          }}
        >
          <FormattedMessage id="unifiedDataTable.diffModeChars" defaultMessage="By character" />
        </EuiContextMenuItem>

        <EuiContextMenuItem
          key="words"
          icon={diffMode === 'words' ? 'check' : 'empty'}
          size="s"
          onClick={() => {
            setDiffMode('words');
          }}
        >
          <FormattedMessage id="unifiedDataTable.diffModeWords" defaultMessage="By word" />
        </EuiContextMenuItem>

        <EuiContextMenuItem
          key="lines"
          icon={diffMode === 'lines' ? 'check' : 'empty'}
          size="s"
          onClick={() => {
            setDiffMode('lines');
          }}
        >
          <FormattedMessage id="unifiedDataTable.diffModeLines" defaultMessage="By line" />
        </EuiContextMenuItem>

        <EuiHorizontalRule margin="none" />

        <EuiPanel
          color="transparent"
          paddingSize="s"
          css={css`
            padding-bottom: 0;
          `}
        >
          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage id="unifiedDataTable.diffSettings" defaultMessage="Settings" />
            </h3>
          </EuiTitle>
        </EuiPanel>

        <EuiPanel color="transparent" paddingSize="s">
          <EuiSwitch
            label={i18n.translate('unifiedDataTable.showDiffDecorations', {
              defaultMessage: 'Show decorations',
            })}
            checked={showDiffDecorations ?? true}
            compressed
            onChange={(e) => {
              setShowDiffDecorations(e.target.checked);
            }}
          />
        </EuiPanel>
      </EuiContextMenuPanel>
    </EuiPopover>
  );
};
