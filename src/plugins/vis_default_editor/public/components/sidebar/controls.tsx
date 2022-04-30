/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiToolTip,
  EuiIconTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import useDebounce from 'react-use/lib/useDebounce';

import { Vis } from 'src/plugins/visualizations/public';
import { discardChanges, EditorAction } from './state';

interface DefaultEditorControlsProps {
  applyChanges(): void;
  isDirty: boolean;
  isInvalid: boolean;
  isTouched: boolean;
  dispatch: React.Dispatch<EditorAction>;
  vis: Vis;
}

function DefaultEditorControls({
  applyChanges,
  isDirty,
  isInvalid,
  isTouched,
  dispatch,
  vis,
}: DefaultEditorControlsProps) {
  const { enableAutoApply } = vis.type.editorConfig;
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const toggleAutoApply = useCallback(
    (nextAutoApplyEnabled) => setAutoApplyEnabled(nextAutoApplyEnabled),
    []
  );
  const onClickDiscard = useCallback(() => dispatch(discardChanges(vis)), [dispatch, vis]);

  useDebounce(
    () => {
      if (autoApplyEnabled && isDirty) {
        applyChanges();
      }
    },
    300,
    [isDirty, autoApplyEnabled, applyChanges]
  );

  return (
    <div className="visEditorSidebar__controls">
      {!autoApplyEnabled && (
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="visualizeEditorResetButton"
              disabled={!isDirty}
              iconType="cross"
              onClick={onClickDiscard}
              size="s"
            >
              <FormattedMessage
                id="visDefaultEditor.sidebar.discardChangesButtonLabel"
                defaultMessage="Discard"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            {isInvalid && isTouched ? (
              <EuiToolTip
                content={i18n.translate('visDefaultEditor.sidebar.errorButtonTooltip', {
                  defaultMessage: 'Errors in the highlighted fields need to be resolved.',
                })}
              >
                <EuiButton color="danger" iconType="alert" size="s" disabled>
                  <FormattedMessage
                    id="visDefaultEditor.sidebar.updateChartButtonLabel"
                    defaultMessage="Update"
                  />
                </EuiButton>
              </EuiToolTip>
            ) : (
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={i18n.translate('visDefaultEditor.sidebar.updateInfoTooltip', {
                      defaultMessage: 'CTRL + Enter is a shortcut for Update.',
                    })}
                    type="keyboardShortcut"
                    color="subdued"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="visualizeEditorRenderButton"
                    disabled={!isDirty}
                    fill
                    iconType="play"
                    onClick={applyChanges}
                    size="s"
                  >
                    <FormattedMessage
                      id="visDefaultEditor.sidebar.updateChartButtonLabel"
                      defaultMessage="Update"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {enableAutoApply && (
        <EuiToolTip
          title={
            autoApplyEnabled
              ? i18n.translate('visDefaultEditor.sidebar.autoApplyChangesOnLabel', {
                  defaultMessage: 'Auto apply is on',
                })
              : i18n.translate('visDefaultEditor.sidebar.autoApplyChangesOffLabel', {
                  defaultMessage: 'Auto apply is off',
                })
          }
          content={i18n.translate('visDefaultEditor.sidebar.autoApplyChangesTooltip', {
            defaultMessage: 'Auto updates the visualization on every change.',
          })}
        >
          <EuiButton
            className="visEditorSidebar__autoApplyButton"
            data-test-subj="visualizeEditorAutoButton"
            iconType="refresh"
            color={autoApplyEnabled ? 'primary' : 'text'}
            fill
            onClick={() => toggleAutoApply(!autoApplyEnabled)}
            size="s"
            minWidth={80}
            aria-label={
              autoApplyEnabled
                ? i18n.translate('visDefaultEditor.sidebar.autoApplyChangesLabelOn', {
                    defaultMessage: 'Auto apply is on',
                  })
                : i18n.translate('visDefaultEditor.sidebar.autoApplyChangesLabelOff', {
                    defaultMessage: 'Auto apply is off',
                  })
            }
          >
            {autoApplyEnabled
              ? i18n.translate('visDefaultEditor.sidebar.autoApplyChangesOn', {
                  defaultMessage: 'On',
                })
              : i18n.translate('visDefaultEditor.sidebar.autoApplyChangesOff', {
                  defaultMessage: 'Off',
                })}
          </EuiButton>
        </EuiToolTip>
      )}
    </div>
  );
}

export { DefaultEditorControls };
