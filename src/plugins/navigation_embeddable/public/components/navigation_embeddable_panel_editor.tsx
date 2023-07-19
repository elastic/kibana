/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import React, { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';

import {
  EuiText,
  EuiIcon,
  EuiForm,
  EuiTitle,
  EuiPanel,
  IconType,
  EuiSpacer,
  EuiButton,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyoutBody,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSwitch,
  EuiFieldText,
} from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import {
  DASHBOARD_LINK_TYPE,
  EXTERNAL_LINK_TYPE,
  NavigationEmbeddableAttributes,
  NavigationEmbeddableLink,
} from '../../common/content_management';
import { NavigationLinkInfo } from '../embeddable/types';
import { NavEmbeddableStrings } from './navigation_embeddable_strings';
import { memoizedFetchDashboard } from './dashboard_link/dashboard_link_tools';
import { NavigationEmbeddableLinkEditor } from './navigation_embeddable_link_editor';

import './navigation_embeddable.scss';

export const NavigationEmbeddablePanelEditor = ({
  onSave,
  onClose,
  attributes,
  savedObjectId,
  parentDashboard,
}: {
  onSave: (attributes: NavigationEmbeddableAttributes, useRefType: boolean) => void;
  onClose: () => void;
  attributes?: NavigationEmbeddableAttributes;
  savedObjectId?: string;
  parentDashboard?: DashboardContainer;
}) => {
  const [showLinkEditorFlyout, setShowLinkEditorFlyout] = useState(false);
  const [links, setLinks] = useState(attributes?.links);
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [libraryTitle, setLibraryTitle] = useState<string | undefined>();

  /**
   * TODO: There is probably a more efficient way of storing the dashboard information "temporarily" for any new
   * panels and only fetching the dashboard saved objects when first loading this flyout.
   *
   * Will need to think this through and fix as part of the editing process - not worth holding this PR, since it's
   * blocking so much other work :)
   */
  const { value: linkList } = useAsync(async () => {
    if (!links || isEmpty(links)) return [];

    const newLinks: Array<{ id: string; icon: IconType; label: string }> = await Promise.all(
      Object.keys(links).map(async (panelId) => {
        let label = links[panelId].label;
        let icon = NavigationLinkInfo[EXTERNAL_LINK_TYPE].icon;

        if (links[panelId].type === DASHBOARD_LINK_TYPE) {
          icon = NavigationLinkInfo[DASHBOARD_LINK_TYPE].icon;
          if (!label) {
            const dashboard = await memoizedFetchDashboard(links[panelId].destination);
            label = dashboard.attributes.title;
          }
        }

        return { id: panelId, label: label || links[panelId].destination, icon };
      })
    );
    return newLinks;
  }, [links]);

  const getIsByValueMode = () => !Boolean(savedObjectId || saveToLibrary);

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
              {!links || Object.keys(links).length === 0 ? (
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
                      <div key={link.id}>
                        <EuiPanel
                          className="navEmbeddablePanelEditor"
                          hasBorder
                          hasShadow={false}
                          paddingSize="s"
                        >
                          <EuiFlexGroup gutterSize="s" responsive={false} wrap={false}>
                            <EuiFlexItem grow={false}>
                              <EuiIcon type={link.icon} color="text" />
                            </EuiFlexItem>
                            <EuiFlexItem className="linkText">
                              <div className="wrapText">{link.label}</div>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiPanel>
                        <EuiSpacer size="s" />
                      </div>
                    );
                  })}
                  <EuiButtonEmpty
                    size="s"
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
            <EuiSwitch
              label="Save to library"
              checked={saveToLibrary}
              compressed
              onChange={(e) => setSaveToLibrary(e.target.checked)}
            />
          </EuiFormRow>
          {saveToLibrary ? (
            <EuiFormRow label={NavEmbeddableStrings.editor.panelEditor.getTitleInputLabel()}>
              <EuiFieldText
                id="titleInput"
                name="title"
                type="text"
                value={libraryTitle ?? ''}
                onChange={(e) => setLibraryTitle(e.target.value)}
                required={saveToLibrary}
              />
            </EuiFormRow>
          ) : null}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} iconType="cross">
              {NavEmbeddableStrings.editor.getCancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              type="submit"
              disabled={!links || isEmpty(links)}
              onClick={() => {
                const newAttributes = { ...attributes, title: libraryTitle, links };
                onSave(newAttributes, !getIsByValueMode());
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
          onClose={() => {
            setShowLinkEditorFlyout(false);
          }}
          onSave={(newLink: NavigationEmbeddableLink) => {
            setLinks({ ...links, [uuidv4()]: newLink });
          }}
          parentDashboard={parentDashboard}
        />
      )}
    </>
  );
};
