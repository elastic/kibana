/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiForm,
  EuiTitle,
  EuiButton,
  EuiToolTip,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiDroppable,
  EuiDraggable,
  EuiFlyoutBody,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiDragDropContext,
  euiDragDropReorder,
  EuiButtonGroupOptionProps,
} from '@elastic/eui';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import {
  NavigationLayoutType,
  NavigationEmbeddableLink,
  NavigationEmbeddableInput,
  NavigationEmbeddableLinkList,
  NAV_HORIZONTAL_LAYOUT,
  NAV_VERTICAL_LAYOUT,
  NavigationLayoutInfo,
} from '../../embeddable/types';
import { NavEmbeddableStrings } from '../navigation_embeddable_strings';
import { openLinkEditorFlyout } from '../../editor/open_link_editor_flyout';
import { memoizedGetOrderedLinkList } from '../../editor/navigation_embeddable_editor_tools';
import { NavigationEmbeddablePanelEditorLink } from './navigation_embeddable_panel_editor_link';
import { NavigationEmbeddablePanelEditorEmptyPrompt } from './navigation_embeddable_panel_editor_empty_prompt';

import './navigation_embeddable_editor.scss';

const NavigationEmbeddablePanelEditor = ({
  onSave,
  onClose,
  initialInput,
  parentDashboard,
}: {
  onClose: () => void;
  parentDashboard?: DashboardContainer;
  initialInput: Partial<NavigationEmbeddableInput>;
  onSave: (input: Partial<NavigationEmbeddableInput>) => void;
}) => {
  const editLinkFlyoutRef: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  const [currentLayout, setCurrentLayout] = useState<NavigationLayoutType>(
    initialInput.layout ?? NAV_VERTICAL_LAYOUT
  );
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

  const saveButtonComponent = useMemo(() => {
    const canSave = orderedLinks.length !== 0;

    const button = (
      <EuiButton
        disabled={!canSave}
        onClick={() => {
          const newLinks = orderedLinks.reduce((prev, link, i) => {
            return { ...prev, [link.id]: { ...link, order: i } };
          }, {} as NavigationEmbeddableLinkList);
          onSave({ links: newLinks, layout: currentLayout });
        }}
      >
        {NavEmbeddableStrings.editor.panelEditor.getSaveButtonLabel()}
      </EuiButton>
    );

    return canSave ? (
      button
    ) : (
      <EuiToolTip content={NavEmbeddableStrings.editor.panelEditor.getEmptyLinksTooltip()}>
        {button}
      </EuiToolTip>
    );
  }, [onSave, orderedLinks, currentLayout]);

  const layoutOptions: EuiButtonGroupOptionProps[] = useMemo(() => {
    return ([NAV_VERTICAL_LAYOUT, NAV_HORIZONTAL_LAYOUT] as NavigationLayoutType[]).map((type) => {
      return {
        id: type,
        label: NavigationLayoutInfo[type].displayName,
      };
    });
  }, []);

  return (
    <>
      <div ref={editLinkFlyoutRef} />
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {initialInput.links && Object.keys(initialInput.links).length > 0
              ? NavEmbeddableStrings.editor.panelEditor.getEditFlyoutTitle()
              : NavEmbeddableStrings.editor.panelEditor.getCreateFlyoutTitle()}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm fullWidth>
          {orderedLinks.length === 0 ? (
            <NavigationEmbeddablePanelEditorEmptyPrompt addLink={() => addOrEditLink()} />
          ) : (
            <>
              <EuiFormRow label={NavEmbeddableStrings.editor.panelEditor.getLinksTitle()}>
                <div>
                  <EuiDragDropContext onDragEnd={onDragEnd}>
                    <EuiDroppable droppableId="navEmbeddableDroppableLinksArea">
                      {orderedLinks.map((link, idx) => (
                        <EuiDraggable
                          spacing="m"
                          index={idx}
                          key={link.id}
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
                </div>
              </EuiFormRow>
              <EuiFormRow label={NavEmbeddableStrings.editor.panelEditor.getLayoutSettingsTitle()}>
                <EuiButtonGroup
                  options={layoutOptions}
                  buttonSize="compressed"
                  idSelected={currentLayout}
                  onChange={(id) => {
                    setCurrentLayout(id as NavigationLayoutType);
                  }}
                  legend={NavEmbeddableStrings.editor.panelEditor.getLayoutSettingsLegend()}
                />
              </EuiFormRow>
            </>
          )}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} iconType="cross">
              {NavEmbeddableStrings.editor.getCancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{saveButtonComponent}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default NavigationEmbeddablePanelEditor;
