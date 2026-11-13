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
  EuiFieldText,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { resolveNodeChipStyle } from '@kbn/workflows-ui';
import type { StepNameEditor } from './use_step_name_editor';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';

/**
 * The panel's header: the step's icon, its name (edited in place), its type, and the close button,
 * with the editor-mode tabs (`children`) flush under them.
 */
export function StepConfigHeader({
  stepType,
  headerTitle,
  titleId,
  typeSubtitleId,
  nameEditor,
  onClose,
  children,
}: {
  readonly stepType: string;
  /** The step's name, or its catalog label while it has none. */
  readonly headerTitle: string;
  readonly titleId: string;
  readonly typeSubtitleId: string;
  readonly nameEditor: StepNameEditor;
  readonly onClose: () => void;
  readonly children?: React.ReactNode;
}) {
  const { euiTheme } = useEuiTheme();
  const chip = resolveNodeChipStyle(euiTheme, stepType, false, {
    isSuccess: false,
    isFailed: false,
  });
  const closeLabel = i18n.translate('workflows.stepConfigPanel.close', {
    defaultMessage: 'Close',
  });
  const stepNameLabel = i18n.translate('workflows.stepConfigPanel.stepName', {
    defaultMessage: 'Step name',
  });
  const editNameLabel = i18n.translate('workflows.stepConfigPanel.editStepName', {
    defaultMessage: 'Edit step name',
  });

  return (
    <div
      css={{
        flex: '0 0 auto',
        borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
        // Keep Form / YAML tabs flush on the header border.
        paddingBottom: 0,
      }}
    >
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
          gap: euiTheme.size.m,
          // Leave room on the right for the absolutely positioned ✕.
          // No bottom padding — tabs sit flush under the title row.
          padding: `${euiTheme.size.base} ${euiTheme.size.xl} 0 ${euiTheme.size.base}`,
        }}
      >
        {/*
            Header: icon · name · pencil · close, with the step type id under the name. The
            icon is per provider family, so it does not tell `data.set` from `data.map`. The
            friendly label is left out on purpose.
          */}
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: euiTheme.size.m,
            minWidth: 0,
            flex: '1 1 auto',
          }}
        >
          <span
            css={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              // Match canvas / Actions menu chip palette for this step type.
              width: euiTheme.size.xxl,
              height: euiTheme.size.xxl,
              flex: '0 0 auto',
              borderRadius: euiTheme.border.radius.small,
              border: `1px solid ${chip.border}`,
              background: chip.background,
            }}
          >
            {/*
                Match canvas / Actions menu glyph tinting: mask-based StepIcons
                honor `iconColor`, but EUI glyphs (e.g. `branch` for if) need
                the SVG fill wrapper used by NodeStepIcon.
              */}
            <span
              css={[
                { color: chip.iconColor, display: 'inline-flex', lineHeight: 0 },
                chip.iconColor ? { '& svg, & svg *': { fill: chip.iconColor } } : undefined,
              ]}
            >
              <StepIcon
                stepType={stepType}
                executionStatus={undefined}
                size="m"
                iconColor={chip.iconColor}
                color={chip.iconColor}
              />
            </span>
          </span>
          <div css={{ minWidth: 0, flex: '1 1 auto' }}>
            {nameEditor.isEditing ? (
              <div
                css={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: euiTheme.size.xs,
                  minHeight: euiTheme.size.xl,
                  justifyContent: 'center',
                }}
              >
                <span id={titleId} hidden>
                  {headerTitle}
                </span>
                <EuiFieldText
                  inputRef={(el) => {
                    nameEditor.inputRef.current = el;
                  }}
                  compressed
                  fullWidth
                  value={nameEditor.draft}
                  isInvalid={Boolean(nameEditor.error)}
                  aria-label={stepNameLabel}
                  data-test-subj="workflowStepConfigPanelNameInput"
                  // Step name is not templatable — reject reference drops.
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'none';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onChange={(e) => nameEditor.changeDraft(e.target.value)}
                  onBlur={nameEditor.commit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      nameEditor.commit();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      nameEditor.revert();
                    }
                  }}
                  css={{
                    // Metric-neutral with EuiTitle size="xxs" (maps to font scale `s`).
                    fontWeight: euiTheme.font.weight.bold,
                    fontSize: euiTheme.font.scale.s * euiTheme.base,
                    lineHeight: euiTheme.size.xl,
                    height: euiTheme.size.xl,
                    minHeight: euiTheme.size.xl,
                    paddingBlock: 0,
                    paddingInline: euiTheme.size.xs,
                  }}
                />
                {nameEditor.error ? (
                  <EuiText
                    size="xs"
                    color="danger"
                    data-test-subj="workflowStepConfigPanelNameError"
                  >
                    {nameEditor.error}
                  </EuiText>
                ) : null}
              </div>
            ) : (
              <EuiTitle size="xxs">
                <h2
                  id={titleId}
                  css={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: euiTheme.size.xs,
                    minHeight: euiTheme.size.xl,
                    maxWidth: '100%',
                    margin: 0,
                  }}
                >
                  <EuiToolTip content={headerTitle} disableScreenReaderOutput>
                    <button
                      type="button"
                      onClick={nameEditor.begin}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          nameEditor.begin();
                        }
                      }}
                      aria-label={editNameLabel}
                      data-test-subj="workflowStepConfigPanelTitle"
                      css={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        minWidth: 0,
                        flex: '1 1 auto',
                        minHeight: euiTheme.size.xl,
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: 'inherit',
                        font: 'inherit',
                        fontWeight: 'inherit',
                        textAlign: 'left',
                        overflow: 'hidden',
                        '&:focus': { outline: 'none' },
                        '&:focus-visible': {
                          outline: `2px solid ${euiTheme.colors.primary}`,
                          outlineOffset: 1,
                        },
                      }}
                    >
                      <span
                        css={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {headerTitle}
                      </span>
                    </button>
                  </EuiToolTip>
                  <EuiButtonIcon
                    iconType="pencil"
                    size="xs"
                    color="text"
                    aria-label={editNameLabel}
                    onClick={nameEditor.begin}
                    data-test-subj="workflowStepConfigPanelEditName"
                    css={{ flex: '0 0 auto' }}
                  />
                </h2>
              </EuiTitle>
            )}
            {/* Outside the rename button: plain, selectable text. */}
            <code
              id={typeSubtitleId}
              title={stepType}
              data-test-subj="workflowStepConfigPanelTypeSubtitle"
              css={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: euiTheme.font.familyCode,
                fontSize: euiTheme.font.scale.xs * euiTheme.base,
                lineHeight: euiTheme.size.base,
                color: euiTheme.colors.textSubdued,
                background: 'transparent',
                padding: 0,
              }}
            >
              {stepType}
            </code>
          </div>
        </div>
      </div>
      <EuiToolTip content={closeLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="cross"
          color="text"
          aria-label={closeLabel}
          onClick={onClose}
          data-test-subj="workflowStepConfigPanelClose"
          css={{
            position: 'absolute',
            top: euiTheme.size.s,
            right: euiTheme.size.s,
            zIndex: 1,
          }}
        />
      </EuiToolTip>
      {children}
    </div>
  );
}
