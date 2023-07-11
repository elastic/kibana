/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty, omit } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';

import {
  EuiText,
  EuiForm,
  EuiTitle,
  EuiPanel,
  EuiSpacer,
  EuiButton,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyoutBody,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  // euiDragDropReorder,
} from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { NavEmbeddableStrings } from './navigation_embeddable_strings';
import { openLinkEditorFlyout } from '../editor/open_link_editor_flyout';
import { NavigationEmbeddableInput, NavigationEmbeddableLinkList } from '../embeddable/types';
import { NavigationEmbeddablePanelEditorLink } from './navigation_embeddable_panel_editor_link';

import './navigation_embeddable.scss';

export const NavigationEmbeddablePanelEditor = ({
  onSave,
  onClose,
  initialInput,
  parentDashboard,
}: {
  onClose: () => void;
  initialInput: Partial<NavigationEmbeddableInput>;
  onSave: (input: Partial<NavigationEmbeddableInput>) => void;
  parentDashboard?: DashboardContainer;
}) => {
  const editLinkFlyoutRef: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);
  const [links, setLinks] = useState<NavigationEmbeddableLinkList>(initialInput?.links ?? {});

  const addOrEditLink = useCallback(
    async (linkToEditId?: string) => {
      const newLinks = await openLinkEditorFlyout({
        links,
        parentDashboard,
        ref: editLinkFlyoutRef,
        idToEdit: linkToEditId, // if this is defined, then we are editing; otherwise, we are adding
      });
      if (newLinks) setLinks(newLinks);
    },
    [editLinkFlyoutRef, links, parentDashboard]
  );

  const deleteLink = useCallback(
    (linkId: string) => {
      setLinks(omit(links, [linkId]));
    },
    [links, setLinks]
  );

  return (
    <>
      <div ref={editLinkFlyoutRef} />
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
                      <EuiButton onClick={() => addOrEditLink()} iconType="plusInCircle">
                        {NavEmbeddableStrings.editor.getAddButtonLabel()}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              ) : (
                <>
                  {Object.keys(links).map((linkId) => {
                    return (
                      <div key={linkId}>
                        <NavigationEmbeddablePanelEditorLink
                          editLink={() => addOrEditLink(linkId)}
                          link={links[linkId]}
                          deleteLink={() => deleteLink(linkId)}
                        />
                        <EuiSpacer size="s" />
                      </div>
                    );
                  })}
                  <EuiButtonEmpty size="s" iconType="plusInCircle" onClick={() => addOrEditLink()}>
                    {NavEmbeddableStrings.editor.getAddButtonLabel()}
                  </EuiButtonEmpty>
                </>
              )}
            </>
          </EuiFormRow>
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
              disabled={!links || isEmpty(links)}
              onClick={() => {
                onSave({ ...initialInput, links });
                onClose();
              }}
            >
              {NavEmbeddableStrings.editor.panelEditor.getSaveButtonLabel()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
