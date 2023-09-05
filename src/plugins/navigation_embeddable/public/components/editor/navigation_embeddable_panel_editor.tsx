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
  EuiSwitch,
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
  const [isSaving, setIsSaving] = useState(false);
  const [orderedLinks, setOrderedLinks] = useState<NavigationEmbeddableLink[]>([]);
  const [saveByReference, setSaveByReference] = useState(!initialLinks ? true : isByReference);

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

  const hasZeroLinks = useMemo(() => {
    return orderedLinks.length === 0;
  }, [orderedLinks]);

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
          {hasZeroLinks ? (
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
                              dragHandleProps={provided.dragHandleProps ?? undefined} // casting `null` to `undefined`
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
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              {!initialLinks || !isByReference ? (
                <EuiFlexItem grow={false}>
                  <TooltipWrapper
                    condition={!hasZeroLinks}
                    tooltipContent={NavEmbeddableStrings.editor.panelEditor.getSaveToLibrarySwitchTooltip()}
                  >
                    <EuiSwitch
                      label={NavEmbeddableStrings.editor.panelEditor.getSaveToLibrarySwitchLabel()}
                      checked={saveByReference}
                      disabled={hasZeroLinks}
                      onChange={() => setSaveByReference(!saveByReference)}
                    />
                  </TooltipWrapper>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <TooltipWrapper
                  condition={hasZeroLinks}
                  tooltipContent={NavEmbeddableStrings.editor.panelEditor.getEmptyLinksTooltip()}
                >
                  <EuiButton
                    fill
                    isLoading={isSaving}
                    disabled={hasZeroLinks}
                    onClick={async () => {
                      if (saveByReference) {
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
                      } else {
                        onAddToDashboard(orderedLinks, currentLayout);
                      }
                    }}
                  >
                    {NavEmbeddableStrings.editor.panelEditor.getSaveButtonLabel()}
                  </EuiButton>
                </TooltipWrapper>
              </EuiFlexItem>
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
