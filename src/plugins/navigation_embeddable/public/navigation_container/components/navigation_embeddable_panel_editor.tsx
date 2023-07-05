/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';
import React, { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';

import {
  EuiText,
  EuiIcon,
  EuiForm,
  EuiTitle,
  EuiPanel,
  IconType,
  EuiSwitch,
  EuiSpacer,
  EuiButton,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyoutBody,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
} from '@elastic/eui';

import { NavigationContainerInput } from '../types';
import { addLink } from '../navigation_container_helpers';
import { ExternalLinkInput } from '../../external_link/types';
import { DashboardLinkInput } from '../../dashboard_link/types';
import { NavEmbeddableStrings } from './navigation_embeddable_strings';
import { NavigationEmbeddableLinkEditor } from './navigation_embeddable_link_editor';
import { memoizedFetchDashboard } from '../../dashboard_link/lib/dashboard_editor_tools';
import { DASHBOARD_LINK_EMBEDDABLE_TYPE } from '../../dashboard_link/embeddable/dashboard_link_embeddable_factory';

import './navigation_embeddable.scss';

export const NavigationEmbeddablePanelEditor = ({
  onSave,
  onClose,
  initialInput,
  currentDashboardId,
}: {
  onClose: () => void;
  initialInput: Partial<NavigationContainerInput>;
  onSave: (input: Partial<NavigationContainerInput>) => void;
  currentDashboardId?: string;
}) => {
  const [showLinkEditorFlyout, setShowLinkEditorFlyout] = useState(false);
  const [panels, setPanels] = useState(initialInput.panels);

  /**
   * TODO: There is probably a more efficient way of storing the dashboard information "temporarily" for any new
   * panels and only fetching the dashboard saved objects when first loading this flyout.
   *
   * Will need to think this through and fix as part of the editing process - not worth holding this PR, since it's
   * blocking so much other work :)
   */
  const { value: linkList } = useAsync(async () => {
    if (!panels || isEmpty(panels)) return [];

    const links: Array<{ icon: IconType; label: string }> = await Promise.all(
      Object.keys(panels).map(async (panelId) => {
        let label = panels[panelId].explicitInput.label;
        let icon = 'link';

        if (panels[panelId].type === DASHBOARD_LINK_EMBEDDABLE_TYPE) {
          icon = 'dashboardApp';
          if (!label) {
            const dashboard = await memoizedFetchDashboard(
              (panels[panelId].explicitInput as DashboardLinkInput).dashboardId
            );
            label = dashboard.attributes.title;
          }
        } else if (!label) {
          label = (panels[panelId].explicitInput as ExternalLinkInput).url;
        }

        return { label, icon };
      })
    );
    return links;
  }, [panels]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{NavEmbeddableStrings.editor.panelEditor.getCreateFlyoutTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm fullWidth>
          <EuiFormRow>
            <>
              {!panels || Object.keys(panels).length === 0 ? (
                <EuiPanel hasBorder={true}>
                  <EuiFlexGroup justifyContent="spaceAround">
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        {NavEmbeddableStrings.editor.panelEditor.getEmptyLinksMessage()}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="s" />
                  <EuiFlexGroup justifyContent="spaceAround">
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        onClick={() => setShowLinkEditorFlyout(true)}
                        iconType="plusInCircle"
                      >
                        {NavEmbeddableStrings.editor.getAddButtonLabel()}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              ) : (
                <>
                  {linkList?.map((link) => {
                    return (
                      <>
                        <EuiPanel hasBorder hasShadow={false} paddingSize="s">
                          <EuiFlexGroup gutterSize="s">
                            <EuiFlexItem grow={false}>
                              <EuiIcon type={link.icon} color="text" />
                            </EuiFlexItem>
                            <EuiFlexItem>{link.label}</EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiPanel>
                        <EuiSpacer size="s" />
                      </>
                    );
                  })}
                  <EuiButtonEmpty
                    size="s"
                    flush="left"
                    iconType="plusInCircle"
                    onClick={() => setShowLinkEditorFlyout(true)}
                  >
                    {NavEmbeddableStrings.editor.getAddButtonLabel()}
                  </EuiButtonEmpty>
                </>
              )}
            </>
          </EuiFormRow>
          <EuiFormRow>
            {/* TODO: As part of https://github.com/elastic/kibana/issues/154362, connect this to the library */}
            <EuiSwitch label="Save to library" compressed onChange={() => {}} checked={false} />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {NavEmbeddableStrings.editor.getCancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => {
                onSave({ ...initialInput, panels });
                onClose();
              }}
            >
              {NavEmbeddableStrings.editor.panelEditor.getSaveButtonLabel()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>

      {showLinkEditorFlyout && (
        <NavigationEmbeddableLinkEditor
          onClose={(closeBothFlyouts: boolean) => {
            if (closeBothFlyouts) {
              onClose();
            } else {
              setShowLinkEditorFlyout(false);
            }
          }}
          onSave={(type, destination, label) => {
            addLink(initialInput, { type, destination, label });
            setPanels(initialInput.panels);
          }}
          currentDashboardId={currentDashboardId}
        />
      )}
    </>
  );
};
