/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  EuiForm,
  EuiBadge,
  EuiTitle,
  EuiButton,
  EuiSwitch,
  EuiFormRow,
  EuiToolTip,
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

import { LinksLayoutInfo } from '../../embeddable/types';
import {
  Link,
  LinksLayoutType,
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from '../../../common/content_management';
import { coreServices } from '../../services/kibana_services';
import { LinksStrings } from '../links_strings';
import { openLinkEditorFlyout } from '../../editor/open_link_editor_flyout';
import { memoizedGetOrderedLinkList } from '../../editor/links_editor_tools';
import { LinksEditorEmptyPrompt } from './links_editor_empty_prompt';
import { LinksEditorSingleLink } from './links_editor_single_link';

import { TooltipWrapper } from '../tooltip_wrapper';

import './links_editor.scss';

const layoutOptions: EuiButtonGroupOptionProps[] = [
  {
    id: LINKS_VERTICAL_LAYOUT,
    label: LinksLayoutInfo[LINKS_VERTICAL_LAYOUT].displayName,
    'data-test-subj': `links--panelEditor--${LINKS_VERTICAL_LAYOUT}LayoutBtn`,
  },
  {
    id: LINKS_HORIZONTAL_LAYOUT,
    label: LinksLayoutInfo[LINKS_HORIZONTAL_LAYOUT].displayName,
    'data-test-subj': `links--panelEditor--${LINKS_HORIZONTAL_LAYOUT}LayoutBtn`,
  },
];

const LinksEditor = ({
  onSaveToLibrary,
  onAddToDashboard,
  onClose,
  initialLinks,
  initialLayout,
  parentDashboard,
  isByReference,
}: {
  onSaveToLibrary: (newLinks: Link[], newLayout: LinksLayoutType) => Promise<void>;
  onAddToDashboard: (newLinks: Link[], newLayout: LinksLayoutType) => void;
  onClose: () => void;
  initialLinks?: Link[];
  initialLayout?: LinksLayoutType;
  parentDashboard?: DashboardContainer;
  isByReference: boolean;
}) => {
  const toasts = coreServices.notifications.toasts;
  const editLinkFlyoutRef = useRef<HTMLDivElement>(null);

  const [currentLayout, setCurrentLayout] = useState<LinksLayoutType>(
    initialLayout ?? LINKS_VERTICAL_LAYOUT
  );
  const [isSaving, setIsSaving] = useState(false);
  const [orderedLinks, setOrderedLinks] = useState<Link[]>([]);
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
    async (linkToEdit?: Link) => {
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
                return { ...newLink, order: linkToEdit.order } as Link;
              }
              return link;
            })
          );
        } else {
          setOrderedLinks([...orderedLinks, { ...newLink, order: orderedLinks.length } as Link]);
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
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m" data-test-subj="links--panelEditor--title">
              <h2>
                {isEditingExisting
                  ? LinksStrings.editor.panelEditor.getEditFlyoutTitle()
                  : LinksStrings.editor.panelEditor.getCreateFlyoutTitle()}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={LinksStrings.editor.panelEditor.getTechnicalPreviewTooltip()}>
              {/* The EuiBadge needs an empty title to prevent the default tooltip */}
              <EuiBadge color="hollow" tabIndex={0} title="">
                {LinksStrings.editor.panelEditor.getTechnicalPreviewLabel()}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm fullWidth>
          <EuiFormRow label={LinksStrings.editor.panelEditor.getLayoutSettingsTitle()}>
            <EuiButtonGroup
              options={layoutOptions}
              buttonSize="compressed"
              idSelected={currentLayout}
              onChange={(id) => {
                setCurrentLayout(id as LinksLayoutType);
              }}
              legend={LinksStrings.editor.panelEditor.getLayoutSettingsLegend()}
            />
          </EuiFormRow>
          <EuiFormRow label={LinksStrings.editor.panelEditor.getLinksTitle()}>
            {/* Needs to be surrounded by a div rather than a fragment so the EuiFormRow can respond
                to the focus of the inner elements */}
            <div>
              {hasZeroLinks ? (
                <LinksEditorEmptyPrompt addLink={() => addOrEditLink()} />
              ) : (
                <>
                  <EuiDragDropContext onDragEnd={onDragEnd}>
                    <EuiDroppable
                      className="linksDroppableLinksArea"
                      droppableId="linksDroppableLinksArea"
                      data-test-subj="links--panelEditor--linksAreaDroppable"
                    >
                      {orderedLinks.map((link, idx) => (
                        <EuiDraggable
                          spacing="m"
                          index={idx}
                          key={link.id}
                          draggableId={link.id}
                          customDragHandle={true}
                          hasInteractiveChildren={true}
                          data-test-subj={`links--panelEditor--draggableLink`}
                        >
                          {(provided) => (
                            <LinksEditorSingleLink
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
                    data-test-subj="links--panelEditor--addLinkBtn"
                  >
                    {LinksStrings.editor.getAddButtonLabel()}
                  </EuiButtonEmpty>
                </>
              )}
            </div>
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              iconType="cross"
              flush="left"
              data-test-subj="links--panelEditor--closeBtn"
            >
              {LinksStrings.editor.getCancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              {!initialLinks || !isByReference ? (
                <EuiFlexItem grow={false}>
                  <TooltipWrapper
                    condition={!hasZeroLinks}
                    tooltipContent={LinksStrings.editor.panelEditor.getSaveToLibrarySwitchTooltip()}
                    data-test-subj="links--panelEditor--saveByReferenceTooltip"
                  >
                    <EuiSwitch
                      label={LinksStrings.editor.panelEditor.getSaveToLibrarySwitchLabel()}
                      checked={saveByReference}
                      disabled={hasZeroLinks}
                      onChange={() => setSaveByReference(!saveByReference)}
                      data-test-subj="links--panelEditor--saveByReferenceSwitch"
                    />
                  </TooltipWrapper>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <TooltipWrapper
                  condition={hasZeroLinks}
                  tooltipContent={LinksStrings.editor.panelEditor.getEmptyLinksTooltip()}
                  data-test-id={'links--panelEditor--saveBtnTooltip'}
                >
                  <EuiButton
                    fill
                    isLoading={isSaving}
                    disabled={hasZeroLinks}
                    data-test-subj={'links--panelEditor--saveBtn'}
                    onClick={async () => {
                      if (saveByReference) {
                        setIsSaving(true);
                        onSaveToLibrary(orderedLinks, currentLayout)
                          .catch((e) => {
                            toasts.addError(e, {
                              title: LinksStrings.editor.panelEditor.getErrorDuringSaveToastTitle(),
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
                    {LinksStrings.editor.panelEditor.getSaveButtonLabel()}
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
export default LinksEditor;
