/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import { PanelSettingsFlyoutSections } from './panel_settings_flyout_sections';
import { usePanelSettings } from './use_panel_settings';
import type { PanelSettingsApi } from './types';

export interface PanelEditFlyoutProps {
  api: PanelSettingsApi;
  /** Flyout title, e.g. "Edit map" */
  title: string;
  /**
   * Read-only rendering of the panel shown at the top of the flyout. Not needed for panels
   * edited in place (e.g. markdown), which only use the flyout for their settings.
   */
  preview?: React.ReactNode;
  /** Label of the link to the full editor, e.g. "Edit in Maps" */
  editorLinkLabel?: string;
  /** Opens the full editor. The link is hidden when not provided. */
  onNavigateToEditor?: () => Promise<void> | void;
  /** Time range used when the user turns on a custom time range */
  fallbackTimeRange?: TimeRange;
  /** Panel type specific options, rendered at the end of the "Panel options" section */
  panelOptions?: React.ReactNode;
  /** Whether the panel type specific options have unapplied changes */
  hasPanelOptionsChanges?: boolean;
  /** Applies the panel type specific options, called with the panel settings on apply */
  onApplyPanelOptions?: () => void | Promise<void>;
  closeFlyout: () => void;
  ariaLabelledBy: string;
}

/**
 * Edit flyout for panels that are configured in a separate editor: it shows a preview of the
 * panel with a link to the editor, and the panel settings (title, description, border, time range).
 */
export const PanelEditFlyout = ({
  api,
  title,
  preview,
  editorLinkLabel,
  onNavigateToEditor,
  fallbackTimeRange,
  panelOptions,
  hasPanelOptionsChanges = false,
  onApplyPanelOptions,
  closeFlyout,
  ariaLabelledBy,
}: PanelEditFlyoutProps) => {
  const panelSettings = usePanelSettings(api, fallbackTimeRange);
  const applyPanelSettings = panelSettings.apply;

  const hasChanges = panelSettings.hasChanges || hasPanelOptionsChanges;

  const applyAll = useCallback(async () => {
    applyPanelSettings();
    if (hasPanelOptionsChanges) await onApplyPanelOptions?.();
  }, [applyPanelSettings, hasPanelOptionsChanges, onApplyPanelOptions]);

  const onApply = useCallback(async () => {
    closeFlyout();
    await applyAll();
  }, [applyAll, closeFlyout]);

  const onEditInEditor = useCallback(async () => {
    // keep the changes made in the flyout, the panel is edited on top of them
    closeFlyout();
    await applyAll();
    await onNavigateToEditor?.();
  }, [applyAll, closeFlyout, onNavigateToEditor]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj="panelEditFlyoutTitle">
          <h2 id={ariaLabelledBy}>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {preview ? (
          <>
            <EuiPanel
              hasBorder
              paddingSize="none"
              css={styles.preview}
              role="img"
              aria-label={i18n.translate('embeddableApi.panelEditFlyout.previewAriaLabel', {
                defaultMessage: 'Panel preview',
              })}
              data-test-subj="panelEditFlyoutPreview"
            >
              {preview}
            </EuiPanel>
            {onNavigateToEditor ? (
              <>
                <EuiSpacer size="s" />
                <EuiButton
                  fullWidth
                  size="s"
                  color="text"
                  onClick={onEditInEditor}
                  data-test-subj="panelEditFlyoutEditorLink"
                >
                  {editorLinkLabel}
                </EuiButton>
              </>
            ) : null}
            <EuiSpacer size="l" />
          </>
        ) : null}
        {panelSettings.state ? (
          <PanelSettingsFlyoutSections
            api={api}
            state={panelSettings.state}
            updateState={panelSettings.updateState}
            fallbackTimeRange={fallbackTimeRange}
            panelOptions={panelOptions}
            // without a preview, the settings are the only content of the flyout
            initialIsOpen={!preview}
            isFirstInFlyoutBody={!preview}
          />
        ) : null}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={closeFlyout}
              flush="left"
              data-test-subj="panelEditFlyoutCancelButton"
            >
              {i18n.translate('embeddableApi.panelEditFlyout.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="check"
              disabled={!hasChanges}
              onClick={onApply}
              data-test-subj="panelEditFlyoutApplyButton"
            >
              {i18n.translate('embeddableApi.panelEditFlyout.applyButtonLabel', {
                defaultMessage: 'Apply and close',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default PanelEditFlyout;

const styles = {
  preview: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      overflow: 'hidden',
      blockSize: `calc(${euiTheme.size.xxl} * 6)`, // 240px
      // the preview is only for looking at the panel, it is edited in the full editor
      '& > *': { pointerEvents: 'none' },
    }),
};
