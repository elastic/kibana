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

import type { DropResult, EuiButtonGroupOptionProps, UseEuiTheme } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiDragDropContext,
  euiDragDropReorder,
  EuiDraggable,
  EuiDroppable,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';

import type { LinksLayoutType } from '../../../common/content_management';
import { LINKS_HORIZONTAL_LAYOUT, LINKS_VERTICAL_LAYOUT } from '../../../common/content_management';
import { focusMainFlyout } from '../../editor/links_editor_tools';
import { openLinkEditorFlyout } from '../../editor/open_link_editor_flyout';
import { coreServices } from '../../services/kibana_services';
import type { ResolvedLink } from '../../types';
import { LinksStrings } from '../links_strings';
import { TooltipWrapper } from '../tooltip_wrapper';
import { LinksEditorEmptyPrompt } from './links_editor_empty_prompt';
import { LinksEditorSingleLink } from './links_editor_single_link';

export type GeneralSettings = {
  title?: string;
  description?: string;
  hideTitle?: boolean;
  hideBorder?: boolean;
};

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
    generalSettings: GeneralSettings
  ) => Promise<void>;
  onAddToDashboard: (
    newLinks: ResolvedLink[],
    newLayout: LinksLayoutType,
    generalSettings: GeneralSettings
  ) => void;
  onClose: () => void;
  initialLinks?: ResolvedLink[];
  initialLayout?: LinksLayoutType;
  initialTitle?: string;
  initialDescription?: string;
  initialHideTitle?: boolean;
  initialHideBorder?: boolean;
  defaultTitleForReset?: string;
  defaultDescriptionForReset?: string;
  parentDashboardId?: string;
  isByReference: boolean;
  flyoutId: string; // used to manage the focus of this flyout after individual link editor flyout is closed
}

export const LinksEditor = ({
  onSaveToLibrary,
  onAddToDashboard,
  onClose,
  initialLinks,
  initialLayout,
  initialTitle = '',
  initialDescription = '',
  initialHideTitle = false,
  initialHideBorder = false,
  defaultTitleForReset,
  defaultDescriptionForReset,
  parentDashboardId,
  isByReference,
  flyoutId,
}: LinksEditorProps) => {
  const { euiTheme } = useEuiTheme();
  const toasts = coreServices.notifications.toasts;
  const isMounted = useMountedState();
  const editLinkFlyoutRef = useRef<HTMLDivElement>(null);

  const [currentLayout, setCurrentLayout] = useState<LinksLayoutType>(
    initialLayout ?? LINKS_VERTICAL_LAYOUT
  );
  const [isSaving, setIsSaving] = useState(false);
  const [orderedLinks, setOrderedLinks] = useState<ResolvedLink[]>([]);
  const [saveByReference, setSaveByReference] = useState(isByReference);

  const [isGeneralSettingsOpen, setIsGeneralSettingsOpen] = useState(false);
  const [isLinksSettingsOpen, setIsLinksSettingsOpen] = useState(true);

  const [panelTitle, setPanelTitle] = useState(initialTitle);
  const [hideTitle, setHideTitle] = useState(initialHideTitle);
  const [panelDescription, setPanelDescription] = useState(initialDescription);
  const [hideBorder, setHideBorder] = useState(initialHideBorder);

  /**
   * Accordion shell: header button has 16px left/right padding so text is inset from the flyout edges.
   * Expanded body (`__childWrapper`) also gets 16px inline padding for form content.
   */
  const accordionShellCss = css`
    inline-size: 100%;
    .euiAccordion__triggerWrapper {
      padding-inline: ${euiTheme.size.base};
    }
    .euiAccordion__childWrapper {
      inline-size: 100%;
      max-inline-size: 100%;
      padding-inline: ${euiTheme.size.base};
    }
  `;

  const accordionFormPaddingCss = css({
    paddingBlockEnd: euiTheme.size.base,
  });

  const isEditingExisting = initialLinks || isByReference;

  useEffect(() => {
    if (!initialLinks) {
      setOrderedLinks([]);
      return;
    }
    setOrderedLinks(initialLinks);
  }, [initialLinks]);

  const buildGeneralSettings = useCallback((): GeneralSettings => {
    return {
      title: panelTitle.trim() !== '' ? panelTitle : undefined,
      description: panelDescription.trim() !== '' ? panelDescription : undefined,
      hideTitle,
      hideBorder,
    };
  }, [hideBorder, hideTitle, panelDescription, panelTitle]);

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
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s" data-test-subj="links--panelEditor--title">
              <h2>
                {isEditingExisting
                  ? LinksStrings.editor.panelEditor.getEditFlyoutTitle()
                  : LinksStrings.editor.panelEditor.getCreateFlyoutTitle()}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={styles.bodyStyles}>
        <>
          <EuiAccordion
            id="links-panel-general-settings"
            css={[
              accordionShellCss,
              css({
                borderBlockEnd: euiTheme.border.thin,
              }),
            ]}
            data-test-subj="links--panelEditor--generalSettingsAccordion"
            buttonContent={
              <EuiTitle
                size="xxs"
                css={css`
                  padding: 2px;
                `}
              >
                <h5>{LinksStrings.editor.panelEditor.getGeneralSettingsAccordionTitle()}</h5>
              </EuiTitle>
            }
            buttonProps={{ paddingSize: 'm' }}
            initialIsOpen={isGeneralSettingsOpen}
            forceState={isGeneralSettingsOpen ? 'open' : 'closed'}
            onToggle={(isOpenNext: boolean) => {
              setIsGeneralSettingsOpen(isOpenNext);
              if (isOpenNext) setIsLinksSettingsOpen(false);
            }}
          >
            <EuiForm fullWidth css={accordionFormPaddingCss}>
              <EuiFormRow>
                <EuiSwitch
                  compressed
                  checked={!hideTitle}
                  data-test-subj="links--panelEditor--generalSettingsShowTitle"
                  id="linksPanelInlineGeneralSettingsHideTitle"
                  label={LinksStrings.editor.panelEditor.getShowTitleLabel()}
                  onChange={(e) => setHideTitle(!e.target.checked)}
                />
              </EuiFormRow>
              <EuiFormRow
                label={LinksStrings.editor.panelEditor.getTitleInputLabel()}
                labelAppend={
                  defaultTitleForReset ? (
                    <EuiButtonEmpty
                      size="xs"
                      data-test-subj="links--panelEditor--generalSettingsResetTitle"
                      onClick={() => setPanelTitle(defaultTitleForReset)}
                      disabled={hideTitle || panelTitle === defaultTitleForReset}
                      aria-label={LinksStrings.editor.panelEditor.getResetTitleAriaLabel()}
                    >
                      {LinksStrings.editor.panelEditor.getResetTitleButtonLabel()}
                    </EuiButtonEmpty>
                  ) : undefined
                }
              >
                <EuiFieldText
                  compressed
                  id="linksPanelInlineGeneralSettingsPanelTitle"
                  data-test-subj="links--panelEditor--generalSettingsTitle"
                  value={panelTitle}
                  disabled={hideTitle}
                  onChange={(e) => setPanelTitle(e.target.value)}
                  aria-label={LinksStrings.editor.panelEditor.getTitleInputAriaLabel()}
                />
              </EuiFormRow>
              <EuiFormRow
                label={LinksStrings.editor.panelEditor.getPanelDescriptionLabel()}
                labelAppend={
                  defaultDescriptionForReset ? (
                    <EuiButtonEmpty
                      size="xs"
                      data-test-subj="links--panelEditor--generalSettingsResetDescription"
                      onClick={() => setPanelDescription(defaultDescriptionForReset)}
                      disabled={panelDescription === defaultDescriptionForReset}
                      aria-label={LinksStrings.editor.panelEditor.getResetDescriptionAriaLabel()}
                    >
                      {LinksStrings.editor.panelEditor.getResetDescriptionButtonLabel()}
                    </EuiButtonEmpty>
                  ) : undefined
                }
              >
                <EuiTextArea
                  compressed
                  id="linksPanelInlineGeneralSettingsPanelDescription"
                  data-test-subj="links--panelEditor--generalSettingsDescription"
                  value={panelDescription}
                  onChange={(e) => setPanelDescription(e.target.value)}
                  placeholder={LinksStrings.editor.panelEditor.getDescriptionPlaceholder()}
                  aria-label={LinksStrings.editor.panelEditor.getDescriptionInputAriaLabel()}
                />
              </EuiFormRow>
              <EuiFormRow>
                <EuiSwitch
                  compressed
                  checked={!hideBorder}
                  data-test-subj="links--panelEditor--generalSettingsShowBorder"
                  id="linksPanelInlineGeneralSettingsBorder"
                  label={LinksStrings.editor.panelEditor.getShowBorderLabel()}
                  onChange={(e) => setHideBorder(!e.target.checked)}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiAccordion>

          <EuiAccordion
            id="links-panel-links-settings"
            css={[
              accordionShellCss,
              css({
                borderBlockEnd: euiTheme.border.thin,
              }),
            ]}
            data-test-subj="links--panelEditor--linksSettingsAccordion"
            buttonContent={
              <EuiTitle
                size="xxs"
                css={css`
                  padding: 2px;
                `}
              >
                <h5>{LinksStrings.editor.panelEditor.getLinksSettingsAccordionTitle()}</h5>
              </EuiTitle>
            }
            buttonProps={{ paddingSize: 'm' }}
            initialIsOpen={isLinksSettingsOpen}
            forceState={isLinksSettingsOpen ? 'open' : 'closed'}
            onToggle={(isOpenNext: boolean) => {
              setIsLinksSettingsOpen(isOpenNext);
              if (isOpenNext) setIsGeneralSettingsOpen(false);
            }}
          >
            <EuiForm fullWidth css={accordionFormPaddingCss}>
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
          </EuiAccordion>
        </>
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
              {!initialLinks || !isByReference ? (
                <EuiFlexItem grow={false}>
                  <TooltipWrapper
                    condition={!hasZeroLinks}
                    tooltipContent={LinksStrings.editor.panelEditor.getSaveToLibrarySwitchTooltip()}
                    data-test-subj="links--panelEditor--saveByReferenceTooltip"
                  >
                    <EuiSwitch
                      compressed
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
                      const generalSettings = buildGeneralSettings();
                      if (saveByReference) {
                        setIsSaving(true);
                        onSaveToLibrary(orderedLinks, currentLayout, generalSettings)
                          .catch((e) => {
                            toasts.addError(e, {
                              title: LinksStrings.editor.panelEditor.getErrorDuringSaveToastTitle(),
                            });
                          })
                          .finally(() => {
                            if (isMounted()) {
                              setIsSaving(false);
                            }
                          });
                      } else {
                        onAddToDashboard(orderedLinks, currentLayout, generalSettings);
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

const styles = {
  droppableStyles: ({ euiTheme }: UseEuiTheme) => css({ margin: `0 -${euiTheme.size.xs}` }),
  bodyStyles: css({
    // Zero out all EuiFlyoutBody default padding so accordions span edge-to-edge.
    '& .euiFlyoutBody__overflowContent': {
      padding: 0,
    },
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
        height: 'var(--kbn-application--content-height)',
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