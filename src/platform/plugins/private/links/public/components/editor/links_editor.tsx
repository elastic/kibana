/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import deepEqual from 'fast-deep-equal';

import type { DropResult, EuiButtonGroupOptionProps, UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDragDropContext,
  euiDragDropReorder,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSplitButton,
  EuiTitle,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';

import { LINKS_HORIZONTAL_LAYOUT, LINKS_VERTICAL_LAYOUT } from '../../../common/constants';
import type { LinksLayoutType } from '../../../common/types';
import { focusMainFlyout } from '../../editor/links_editor_tools';
import { openLinkEditorFlyout } from '../../editor/open_link_editor_flyout';
import { coreServices } from '../../services/kibana_services';
import type { ResolvedLink } from '../../types';
import { LinksStrings } from '../links_strings';
import { LinksEditorEmptyPrompt } from './links_editor_empty_prompt';
import { LinksEditorSingleLink } from './links_editor_single_link';

const layoutOptions: EuiButtonGroupOptionProps[] = [
  {
    id: LINKS_VERTICAL_LAYOUT,
    label: LinksStrings.editor.panelEditor.getVerticalLayoutLabel(),
    'data-test-subj': `links--panelEditor--${LINKS_VERTICAL_LAYOUT}LayoutBtn`,
  },
  {
    id: LINKS_HORIZONTAL_LAYOUT,
    label: LinksStrings.editor.panelEditor.getHorizontalLayoutLabel(),
    'data-test-subj': `links--panelEditor--${LINKS_HORIZONTAL_LAYOUT}LayoutBtn`,
  },
];

export interface LinksEditorProps {
  onSaveToLibrary: (
    newLinks: ResolvedLink[],
    newLayout: LinksLayoutType,
    onCommit: () => void
  ) => Promise<void>;
  onAddToDashboard: (newLinks: ResolvedLink[], newLayout: LinksLayoutType) => void;
  onClose: () => void;
  initialLinks?: ResolvedLink[];
  initialLayout?: LinksLayoutType;
  parentDashboardId?: string;
  isByReference: boolean;
  flyoutId: string; // used to manage the focus of this flyout after individual link editor flyout is closed
  onDraftChange?: (links: ResolvedLink[], layout: LinksLayoutType) => void;
  isPreviewOpen?: boolean;
  onOpenPreview?: () => void;
  onPreview?: (links: ResolvedLink[], layout: LinksLayoutType) => void;
  isPreviewable?: boolean;
  onCancelEdit?: () => void;
}

export const LinksEditor = ({
  onSaveToLibrary,
  onAddToDashboard,
  onClose,
  initialLinks,
  initialLayout,
  parentDashboardId,
  isByReference,
  flyoutId,
  onDraftChange,
  isPreviewOpen = true,
  onOpenPreview,
  onPreview,
  isPreviewable,
  onCancelEdit,
}: LinksEditorProps) => {
  const toasts = coreServices.notifications.toasts;
  const isMounted = useMountedState();
  const editLinkFlyoutRef = useRef<HTMLDivElement>(null);
  const didCommitRef = useRef(false);

  const [currentLayout, setCurrentLayout] = useState<LinksLayoutType>(
    initialLayout ?? LINKS_VERTICAL_LAYOUT
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [orderedLinks, setOrderedLinks] = useState<ResolvedLink[]>(initialLinks ?? []);
  const [previewedState, setPreviewedState] = useState({
    links: initialLinks ?? [],
    layout: initialLayout ?? LINKS_VERTICAL_LAYOUT,
  });

  const isEditingExisting = initialLinks || isByReference;
  const hasChanges = !deepEqual(
    {
      links: initialLinks ?? [],
      layout: initialLayout ?? LINKS_VERTICAL_LAYOUT,
    },
    { links: orderedLinks, layout: currentLayout }
  );
  const canPreview =
    isPreviewable ?? !deepEqual(previewedState, { links: orderedLinks, layout: currentLayout });

  const saveToLibrary = async () => {
    setIsSaving(true);
    try {
      await onSaveToLibrary(orderedLinks, currentLayout, () => {
        didCommitRef.current = true;
      });
    } catch (error) {
      toasts.addError(error, {
        title: LinksStrings.editor.panelEditor.getErrorDuringSaveToastTitle(),
      });
    } finally {
      if (isMounted()) setIsSaving(false);
    }
  };

  useEffect(
    () => () => {
      if (!didCommitRef.current) onCancelEdit?.();
    },
    [onCancelEdit]
  );

  useEffect(() => {
    if (!initialLinks) {
      setOrderedLinks([]);
      return;
    }
    setOrderedLinks(initialLinks);
  }, [initialLinks]);

  useEffect(() => {
    onDraftChange?.(orderedLinks, currentLayout);
  }, [currentLayout, onDraftChange, orderedLinks]);

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult) => {
      if (source && destination) {
        const newList = euiDragDropReorder(orderedLinks, source.index, destination.index).map(
          (link, i) => {
            return link;
          }
        );
        setOrderedLinks(newList);
      }
    },
    [orderedLinks]
  );

  const addOrEditLink = useCallback(
    async (linkToEdit?: ResolvedLink) => {
      const newLink = await openLinkEditorFlyout({
        parentDashboardId,
        link: linkToEdit,
        mainFlyoutId: flyoutId,
        ref: editLinkFlyoutRef,
      });
      if (newLink) {
        if (linkToEdit) {
          setOrderedLinks(
            orderedLinks.map((link) => {
              if (link.id === linkToEdit.id) {
                return newLink as ResolvedLink;
              }
              return link;
            })
          );
        } else {
          setOrderedLinks([...orderedLinks, newLink as ResolvedLink]);
        }
      }
    },
    [editLinkFlyoutRef, orderedLinks, parentDashboardId, flyoutId]
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
      focusMainFlyout(flyoutId);
    },
    [orderedLinks, flyoutId]
  );

  return (
    <>
      <div css={styles.flyoutStyles} ref={editLinkFlyoutRef} />
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s" data-test-subj="links--panelEditor--title">
              <h2>
                {isEditingExisting
                  ? LinksStrings.editor.panelEditor.getEditFlyoutTitle()
                  : LinksStrings.editor.panelEditor.getCreateFlyoutTitle()}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {!isPreviewOpen && onOpenPreview ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="inspect"
                onClick={onOpenPreview}
                data-test-subj="linksPanelEditorOpenPreviewButton"
              >
                {LinksStrings.editor.panelEditor.getOpenPreviewButtonLabel()}
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={styles.bodyStyles}>
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
                      css={styles.droppableStyles}
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
                    iconType="plusCircle"
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
              flush="left"
              data-test-subj="links--panelEditor--closeBtn"
            >
              {LinksStrings.editor.getCancelButtonLabel()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              {onPreview ? (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="success"
                    data-test-subj="linksPanelEditorRunPreviewButton"
                    disabled={!canPreview}
                    iconType="play"
                    onClick={() => {
                      onPreview(orderedLinks, currentLayout);
                      setPreviewedState({ links: orderedLinks, layout: currentLayout });
                    }}
                  >
                    {LinksStrings.editor.panelEditor.getRunPreviewButtonLabel()}
                  </EuiButton>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                {isByReference ? (
                  <EuiButton
                    fill
                    isLoading={isSaving}
                    disabled={hasZeroLinks || !hasChanges}
                    data-test-subj={'links--panelEditor--saveBtn'}
                    onClick={saveToLibrary}
                  >
                    {LinksStrings.editor.panelEditor.getSaveButtonLabel()}
                  </EuiButton>
                ) : (
                  <EuiSplitButton fill isDisabled={hasZeroLinks} isLoading={isSaving}>
                    <EuiSplitButton.ActionPrimary
                      data-test-subj="links--panelEditor--saveBtn"
                      isDisabled={!hasChanges}
                      onClick={() => {
                        didCommitRef.current = true;
                        onAddToDashboard(orderedLinks, currentLayout);
                      }}
                    >
                      {LinksStrings.editor.panelEditor.getApplyButtonLabel()}
                    </EuiSplitButton.ActionPrimary>
                    <EuiSplitButton.ActionSecondary
                      aria-label={LinksStrings.editor.panelEditor.getMoreSaveOptionsButtonLabel()}
                      data-test-subj="links--panelEditor--saveOptionsBtn"
                      iconType="chevronSingleDown"
                      onClick={() => setIsSaveMenuOpen((isOpen) => !isOpen)}
                      tooltipProps={{
                        content: LinksStrings.editor.panelEditor.getSaveToLibraryTooltip(),
                      }}
                      popoverProps={{
                        isOpen: isSaveMenuOpen,
                        closePopover: () => setIsSaveMenuOpen(false),
                        panelPaddingSize: 'none',
                        children: (
                          <EuiContextMenuPanel>
                            <EuiContextMenuItem
                              data-test-subj="links--panelEditor--saveToLibraryBtn"
                              icon="save"
                              onClick={() => {
                                setIsSaveMenuOpen(false);
                                saveToLibrary();
                              }}
                            >
                              {LinksStrings.editor.panelEditor.getSaveToLibraryButtonLabel()}
                            </EuiContextMenuItem>
                          </EuiContextMenuPanel>
                        ),
                      }}
                    />
                  </EuiSplitButton>
                )}
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

const styles = {
  droppableStyles: ({ euiTheme }: UseEuiTheme) => css({ margin: `0 -${euiTheme.size.xs}` }),
  bodyStyles: css({
    // EUI TODO: We need to set transform to 'none' to avoid drag/drop issues in the flyout caused by the
    // `transform: translateZ(0)` workaround for the mask image bug in Chromium.
    // https://github.com/elastic/eui/pull/7855.
    '& .euiFlyoutBody__overflow': {
      transform: 'none',
    },
  }),
  flyoutStyles: ({ euiTheme }: UseEuiTheme) => {
    const euiFlyoutOpenAnimation = keyframes`
    0% {
      opacity: 0;
      transform: translateX(100%);
    }

    100% {
      opacity: 1;
      transform: translateX(0%);
    }
  `;

    const euiFlyoutCloseAnimation = keyframes`
    0% {
      opacity: 1;
      transform: translateX(0%);
    }

    100% {
      opacity: 0;
      transform: translateX(100%);
    }`;

    return css({
      '.linkEditor': {
        maxInlineSize: `calc(${euiTheme.size.xs} * 125)`,
        height: 'var(--kbn-layout--application-height)',
        position: 'fixed',
        display: 'flex',
        inlineSize: '50vw',
        zIndex: euiTheme.levels.flyout,
        alignItems: 'stretch',
        flexDirection: 'column',
        borderLeft: euiTheme.border.thin,
        background: euiTheme.colors.backgroundBasePlain,
        minWidth: `calc((${euiTheme.size.xl} * 13) + ${euiTheme.size.s})`, // 424px
        '&.in': {
          animation: `${euiFlyoutOpenAnimation} ${euiTheme.animation.normal} ${euiTheme.animation.resistance}`,
        },
        '&.out': {
          animation: `${euiFlyoutCloseAnimation} ${euiTheme.animation.normal} ${euiTheme.animation.resistance}`,
        },
      },
    });
  },
};
