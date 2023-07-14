/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useObservable from 'react-use/lib/useObservable';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiText,
  EuiForm,
  EuiImage,
  EuiTitle,
  EuiPanel,
  EuiSpacer,
  EuiButton,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiDroppable,
  EuiDraggable,
  EuiFlyoutBody,
  EuiEmptyPrompt,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiDragDropContext,
  euiDragDropReorder,
} from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import { coreServices } from '../services/kibana_services';
import {
  NavigationEmbeddableLink,
  NavigationEmbeddableInput,
  NavigationEmbeddableLinkList,
} from '../embeddable/types';
import { NavEmbeddableStrings } from './navigation_embeddable_strings';

import { openLinkEditorFlyout } from '../editor/open_link_editor_flyout';
import { memoizedGetOrderedLinkList } from '../editor/navigation_embeddable_editor_tools';
import { NavigationEmbeddablePanelEditorLink } from './navigation_embeddable_panel_editor_link';

import noLinksIllustrationDark from '../assets/empty_links_dark.svg';
import noLinksIllustrationLight from '../assets/empty_links_light.svg';

import './navigation_embeddable.scss';

const NavigationEmbeddablePanelEditor = ({
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
  const isDarkTheme = useObservable(coreServices.theme.theme$)?.darkMode;
  const editLinkFlyoutRef: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  const [orderedLinks, setOrderedLinks] = useState<NavigationEmbeddableLink[]>([]);

  useEffect(() => {
    const { links: initialLinks } = initialInput;
    if (!initialLinks) {
      setOrderedLinks([]);
      return;
    }
    setOrderedLinks(memoizedGetOrderedLinkList(initialLinks));
  }, [initialInput]);

  const onDragEnd = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const newList = euiDragDropReorder(orderedLinks, source.index, destination.index);
        setOrderedLinks(newList);
      }
    },
    [orderedLinks]
  );

  const addOrEditLink = useCallback(
    async (linkToEdit?: NavigationEmbeddableLink) => {
      const newLink = await openLinkEditorFlyout({
        parentDashboard,
        link: linkToEdit,
        ref: editLinkFlyoutRef,
      });
      if (newLink) {
        if (linkToEdit) {
          setOrderedLinks(
            orderedLinks.map((link) => {
              if (link.id === linkToEdit.id) {
                return { ...newLink, order: linkToEdit.order };
              }
              return link;
            })
          );
        } else {
          setOrderedLinks([...orderedLinks, { ...newLink, order: orderedLinks.length }]);
        }
      }
    },
    [editLinkFlyoutRef, orderedLinks, parentDashboard]
  );

  const deleteLink = useCallback(
    (linkId: string) => {
      setOrderedLinks(
        orderedLinks.filter((link) => {
          return link.id !== linkId;
        })
      );
    },
    [orderedLinks]
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
              {orderedLinks.length === 0 ? (
                <EuiPanel paddingSize="m" hasBorder={true}>
                  <EuiEmptyPrompt
                    paddingSize="none"
                    hasShadow={false}
                    color="plain"
                    icon={
                      <EuiImage
                        alt="alt"
                        size="s"
                        src={isDarkTheme ? noLinksIllustrationDark : noLinksIllustrationLight}
                      />
                    }
                    body={
                      <>
                        <EuiText size="s">
                          {NavEmbeddableStrings.editor.panelEditor.getEmptyLinksMessage()}
                        </EuiText>
                        <EuiSpacer size="m" />
                        <EuiButton size="s" onClick={() => addOrEditLink()} iconType="plusInCircle">
                          {NavEmbeddableStrings.editor.getAddButtonLabel()}
                        </EuiButton>
                      </>
                    }
                  />
                </EuiPanel>
              ) : (
                <>
                  <EuiDragDropContext onDragEnd={onDragEnd}>
                    <EuiDroppable droppableId="CUSTOM_HANDLE_DROPPABLE_AREA">
                      {orderedLinks.map((link, idx) => (
                        <EuiDraggable
                          spacing="m"
                          key={link.id}
                          index={idx}
                          draggableId={link.id}
                          customDragHandle={true}
                          hasInteractiveChildren={true}
                        >
                          {(provided) => (
                            <NavigationEmbeddablePanelEditorLink
                              link={link}
                              parentDashboard={parentDashboard}
                              editLink={() => addOrEditLink(link)}
                              deleteLink={() => deleteLink(link.id)}
                              dragHandleProps={provided.dragHandleProps}
                            />
                          )}
                        </EuiDraggable>
                      ))}
                    </EuiDroppable>
                  </EuiDragDropContext>
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
              disabled={orderedLinks.length === 0}
              onClick={() => {
                const newLinks = orderedLinks.reduce((prev, link, i) => {
                  return { ...prev, [link.id]: { ...link, order: i } };
                }, {} as NavigationEmbeddableLinkList);
                onSave({ links: newLinks });
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

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default NavigationEmbeddablePanelEditor;
