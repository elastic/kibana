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

import React, { useCallback, useEffect } from 'react';
import { EuiBottomBar, EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Vis } from 'ui/vis';
import { useEditorContext } from '../state';

interface DefaultEditorBottomBarProps {
  vis: Vis;
  state: any;
  discardChanges(vis: Vis): void;
}

function DefaultEditorBottomBar({ discardChanges, vis, state }: DefaultEditorBottomBarProps) {
  const { enableAutoApply } = vis.type.editorConfig;
  const onClickDiscard = useCallback(() => discardChanges(vis), [discardChanges, vis]);
  const { isDirty, setDirty } = useEditorContext();

  const applyChanges = useCallback(() => {
    vis.setCurrentState(state);
    vis.updateState();
    vis.emit('dirtyStateChange', {
      isDirty: false,
    });
    setDirty(false);
  }, [vis, state]);

  useEffect(() => {
    vis.on('dirtyStateChange', ({ isDirty: dirty }: { isDirty: boolean }) => {
      setDirty(dirty);
    });
  }, [vis]);

  return (
    <EuiBottomBar>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false} />
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            {!enableAutoApply && (
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
                  <EuiButton
                    aria-label={i18n.translate(
                      'common.ui.vis.editors.sidebar.applyChangesAriaLabel',
                      {
                        defaultMessage: 'Update the visualization with your changes',
                      }
                    )}
                    color="ghost"
                    disabled={!isDirty || enableAutoApply}
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
