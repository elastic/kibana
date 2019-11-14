/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBottomBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonToggle,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Vis } from 'ui/vis';
import { discardChanges, EditorAction } from '../state';

interface DefaultEditorBottomBarProps {
  applyChanges(): void;
  isDirty: boolean;
  isInvalid: boolean;
  isTouched: boolean;
  dispatch: React.Dispatch<EditorAction>;
  vis: Vis;
}

function DefaultEditorBottomBar({
  applyChanges,
  isDirty,
  isInvalid,
  isTouched,
  dispatch,
  vis,
}: DefaultEditorBottomBarProps) {
  const { enableAutoApply } = vis.type.editorConfig;
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const toggleAutoApply = useCallback(e => setAutoApplyEnabled(e.target.checked), []);
  const onClickDiscard = useCallback(() => dispatch(discardChanges(vis)), [dispatch, vis]);

  useEffect(() => {
    if (autoApplyEnabled && isDirty) {
      applyChanges();
    }
  }, [isDirty, autoApplyEnabled]);

  return (
    <EuiBottomBar>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false} />
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            {enableAutoApply && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate('common.ui.vis.editors.sidebar.autoApplyChangesTooltip', {
                    defaultMessage: 'Auto apply editor changes.',
                  })}
                >
                  <EuiButtonToggle
                    aria-label={i18n.translate(
                      'common.ui.vis.editors.sidebar.autoApplyChangesAriaLabel',
                      {
                        defaultMessage: 'Auto update the visualization on every change',
                      }
                    )}
                    data-test-subj="visualizeEditorAutoButton"
                    fill={autoApplyEnabled}
                    iconType="refresh"
                    isSelected={autoApplyEnabled}
                    label={i18n.translate('common.ui.vis.editors.sidebar.autoApplyChangesLabel', {
                      defaultMessage: 'Auto apply',
                    })}
                    onChange={toggleAutoApply}
                    size="s"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
            {!autoApplyEnabled && (
              <>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    aria-label={i18n.translate(
                      'common.ui.vis.editors.sidebar.discardChangesAriaLabel',
                      {
                        defaultMessage: 'Reset the visualization',
                      }
                    )}
                    color="ghost"
                    data-test-subj="visualizeEditorResetButton"
                    disabled={!isDirty}
                    iconType="cross"
                    onClick={onClickDiscard}
                    size="s"
                  >
                    <FormattedMessage
                      id="common.ui.vis.editors.sidebar.discardChangesButtonLabel"
                      defaultMessage="Discard changes"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  {isInvalid && isTouched ? (
                    <EuiToolTip
                      content={i18n.translate('common.ui.vis.editors.sidebar.errorButtonTooltip', {
                        defaultMessage: 'Errors in the highlighted fields need to be resolved.',
                      })}
                    >
                      <EuiButton
                        aria-label={i18n.translate(
                          'common.ui.vis.editors.sidebar.errorButtonAriaLabel',
                          {
                            defaultMessage: 'Errors in the highlighted fields need to be resolved.',
                          }
                        )}
                        color="danger"
                        iconType="alert"
                        size="s"
                      >
                        <FormattedMessage
                          id="common.ui.vis.editors.sidebar.updateChartButtonLabel"
                          defaultMessage="Update chart"
                        />
                      </EuiButton>
                    </EuiToolTip>
                  ) : (
                    <EuiButton
                      aria-label={i18n.translate(
                        'common.ui.vis.editors.sidebar.applyChangesAriaLabel',
                        {
                          defaultMessage: 'Update the visualization with your changes',
                        }
                      )}
                      color="ghost"
                      disabled={!isDirty}
                      fill
                      iconType="play"
                      onClick={applyChanges}
                      size="s"
                    >
                      <FormattedMessage
                        id="common.ui.vis.editors.sidebar.updateChartButtonLabel"
                        defaultMessage="Update chart"
                      />
                    </EuiButton>
                  )}
                </EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBottomBar>
  );
}

export { DefaultEditorBottomBar };
