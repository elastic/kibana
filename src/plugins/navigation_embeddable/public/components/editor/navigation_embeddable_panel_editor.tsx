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

import { NavigationLayoutInfo } from '../../embeddable/types';
import {
  NavigationEmbeddableLink,
  NavigationLayoutType,
  NAV_HORIZONTAL_LAYOUT,
  NAV_VERTICAL_LAYOUT,
} from '../../../common/content_management';
import { coreServices } from '../../services/kibana_services';
import { NavEmbeddableStrings } from '../navigation_embeddable_strings';
import { openLinkEditorFlyout } from '../../editor/open_link_editor_flyout';
import { memoizedGetOrderedLinkList } from '../../editor/navigation_embeddable_editor_tools';
import { NavigationEmbeddablePanelEditorLink } from './navigation_embeddable_panel_editor_link';
import { NavigationEmbeddablePanelEditorEmptyPrompt } from './navigation_embeddable_panel_editor_empty_prompt';

import { TooltipWrapper } from '../tooltip_wrapper';

import './navigation_embeddable_editor.scss';

const layoutOptions: EuiButtonGroupOptionProps[] = [
  {
    id: NAV_VERTICAL_LAYOUT,
    label: NavigationLayoutInfo[NAV_VERTICAL_LAYOUT].displayName,
  },
  {
    id: NAV_HORIZONTAL_LAYOUT,
    label: NavigationLayoutInfo[NAV_HORIZONTAL_LAYOUT].displayName,
  },
];

const NavigationEmbeddablePanelEditor = ({
  onSaveToLibrary,
  onAddToDashboard,
  onClose,
  initialLinks,
  initialLayout,
  parentDashboard,
  isByReference,
}: {
  onSaveToLibrary: (
    newLinks: NavigationEmbeddableLink[],
    newLayout: NavigationLayoutType
  ) => Promise<void>;
  onAddToDashboard: (newLinks: NavigationEmbeddableLink[], newLayout: NavigationLayoutType) => void;
  onClose: () => void;
  initialLinks?: NavigationEmbeddableLink[];
  initialLayout?: NavigationLayoutType;
  parentDashboard?: DashboardContainer;
  isByReference: boolean;
}) => {
  const toasts = coreServices.notifications.toasts;
  const editLinkFlyoutRef: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  const [currentLayout, setCurrentLayout] = useState<NavigationLayoutType>(
    initialLayout ?? NAV_VERTICAL_LAYOUT
  );
  const [orderedLinks, setOrderedLinks] = useState<NavigationEmbeddableLink[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isEditingExisting = initialLinks || isByReference;

  useEffect(() => {
    if (!initialLinks) {
      setOrderedLinks([]);
      return;
    }
    setOrderedLinks(memoizedGetOrderedLinkList(initialLinks));
  }, [initialLinks]);

  const onDragEnd = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const newList = euiDragDropReorder(orderedLinks, source.index, destination.index).map(
          (link, i) => {
            return { ...link, order: i };
          }
        );
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
          <h2>
            {isEditingExisting
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
              <EuiFormRow label={NavEmbeddableStrings.editor.panelEditor.getLinksTitle()}>
                {/* Needs to be surrounded by a div rather than a fragment so the EuiFormRow can respond
                    to the focus of the inner elements */}
                <div>
                  <EuiDragDropContext onDragEnd={onDragEnd}>
                    <EuiDroppable
                      className="navEmbeddableDroppableLinksArea"
                      droppableId="navEmbeddableDroppableLinksArea"
                    >
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
                  <EuiButtonEmpty
                    flush="left"
                    size="s"
                    iconType="plusInCircle"
                    onClick={() => addOrEditLink()}
                  >
                    {NavEmbeddableStrings.editor.getAddButtonLabel()}
                  </EuiButtonEmpty>
                </div>
              </EuiFormRow>
            </>
          )}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} iconType="cross" flush="left">
              {NavEmbeddableStrings.editor.getCancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m">
              {!isByReference ? (
                <EuiFlexItem grow={false} css={{ 'margin-left': 'auto' }}>
                  <TooltipWrapper
                    condition={!initialLinks}
                    tooltipContent={NavEmbeddableStrings.editor.panelEditor.getAddToDashboardButtonTooltip()}
                  >
                    <EuiButton
                      disabled={orderedLinks.length === 0}
                      isLoading={isSaving}
                      onClick={() => {
                        onAddToDashboard(orderedLinks, currentLayout);
                      }}
                    >
                      {initialLinks
                        ? NavEmbeddableStrings.editor.panelEditor.getApplyButtonLabel()
                        : NavEmbeddableStrings.editor.panelEditor.getAddToDashboardButtonLabel()}
                    </EuiButton>
                  </TooltipWrapper>
                </EuiFlexItem>
              ) : null}
              {!initialLinks || isByReference ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    repositionOnScroll={false}
                    position="top"
                    content={
                      <p>
                        {initialLinks
                          ? NavEmbeddableStrings.editor.panelEditor.getUpdateLibraryItemButtonTooltip()
                          : NavEmbeddableStrings.editor.panelEditor.getSaveToLibraryButtonTooltip()}
                      </p>
                    }
                  >
                    <EuiButton
                      fill
                      iconType="folderCheck"
                      disabled={orderedLinks.length === 0}
                      isLoading={isSaving}
                      onClick={async () => {
                        setIsSaving(true);
                        onSaveToLibrary(orderedLinks, currentLayout)
                          .catch((e) => {
                            toasts.addError(e, {
                              title:
                                NavEmbeddableStrings.editor.panelEditor.getErrorDuringSaveToastTitle(),
                            });
                          })
                          .finally(() => {
                            setIsSaving(false);
                          });
                      }}
                    >
                      {initialLinks
                        ? NavEmbeddableStrings.editor.panelEditor.getUpdateLibraryItemButtonLabel()
                        : NavEmbeddableStrings.editor.panelEditor.getSaveToLibraryButtonLabel()}
                    </EuiButton>
                  </EuiToolTip>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default NavigationEmbeddablePanelEditor;
