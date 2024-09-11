/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSplitPanel,
  EuiToolTip,
  useEuiTour,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiScreenReaderOnly,
  useResizeObserver,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { downloadFileAs } from '@kbn/share-plugin/public';
import { getConsoleTourStepProps } from './get_console_tour_step_props';
import { useServicesContext } from '../../contexts';
import { MAIN_PANEL_LABELS } from './i18n';
import { NavIconButton } from './nav_icon_button';
import { Editor } from '../editor';
import { Config } from '../config';
import {
  useEditorReadContext,
  useEditorActionContext,
  useRequestActionContext,
} from '../../contexts';
import {
  TopNavMenu,
  SomethingWentWrongCallout,
  HelpPopover,
  ShortcutsPopover,
  ConsoleTourStep,
  ConsoleTourStepProps,
} from '../../components';
import { History } from '../history';
import { useDataInit } from '../../hooks';
import { getTopNavConfig } from './get_top_nav';
import { getTourSteps } from './get_tour_steps';
import {
  SHELL_TAB_ID,
  HISTORY_TAB_ID,
  CONFIG_TAB_ID,
  EDITOR_TOUR_STEP,
  TOUR_STORAGE_KEY,
  INITIAL_TOUR_CONFIG,
  FILES_TOUR_STEP,
  EXPORT_FILE_NAME,
} from './constants';

interface MainProps {
  currentTabProp?: string;
  isEmbeddable?: boolean;
}

// 2MB limit (2 * 1024 * 1024 bytes)
const MAX_FILE_UPLOAD_SIZE = 2 * 1024 * 1024;

export function Main({ currentTabProp, isEmbeddable = false }: MainProps) {
  const dispatch = useEditorActionContext();
  const requestDispatch = useRequestActionContext();
  const { currentView } = useEditorReadContext();
  const currentTab = currentTabProp ?? currentView;
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFullscreenOpen, setIsFullScreen] = useState(false);

  const [resizeRef, setResizeRef] = useState<HTMLDivElement | null>(null);
  const containerDimensions = useResizeObserver(resizeRef);

  const {
    docLinks,
    services: { notifications, routeHistory },
  } = useServicesContext();

  const storageTourState = localStorage.getItem(TOUR_STORAGE_KEY);
  const initialTourState = storageTourState ? JSON.parse(storageTourState) : INITIAL_TOUR_CONFIG;
  const [tourStepProps, actions, tourState] = useEuiTour(getTourSteps(docLinks), initialTourState);

  useEffect(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(tourState));
  }, [tourState]);

  // Clean up request output when switching tabs
  useEffect(() => {
    requestDispatch({ type: 'cleanRequest', payload: undefined });
  }, [currentView, requestDispatch]);

  const consoleTourStepProps: ConsoleTourStepProps[] = getConsoleTourStepProps(
    tourStepProps,
    actions,
    tourState
  );

  const { done, error, retry } = useDataInit();

  const { currentTextObject } = useEditorReadContext();
  const [inputEditorValue, setInputEditorValue] = useState<string>(currentTextObject?.text ?? '');

  const updateTab = (tab: string) => {
    if (routeHistory) {
      routeHistory?.push(`/console/${tab}`);
    } else {
      dispatch({ type: 'setCurrentView', payload: tab });
    }
  };

  const toggleFullscreen = () => {
    const isEnabled = !isFullscreenOpen;

    setIsFullScreen(isEnabled);

    if (isEnabled) {
      document.querySelector('#consoleRoot')?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const file = files && files[0];
    // Clear the input value so that a file can be imported again
    event.target.value = '';

    if (file) {
      if (file.size > MAX_FILE_UPLOAD_SIZE) {
        notifications.toasts.addSuccess(
          i18n.translate('console.notification.error.fileTooBigMessage', {
            defaultMessage: `File size exceeds the 2MB limit.`,
          })
        );
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        const fileContent = e?.target?.result;

        if (fileContent) {
          dispatch({
            type: 'setFileToImport',
            payload: fileContent as string,
          });

          notifications.toasts.addSuccess(
            i18n.translate('console.notification.fileImportedSuccessfully', {
              defaultMessage: `The file you selected has been imported successfully.`,
            })
          );
        } else {
          notifications.toasts.add(
            i18n.translate('console.notification.error.fileImportNoContent', {
              defaultMessage: `The file you selected doesn't appear to have any content. Please select a different file.`,
            })
          );
        }
      };

      reader.readAsText(file);
    }
  };

  if (error) {
    return (
      <EuiPageTemplate.EmptyPrompt color="danger">
        <SomethingWentWrongCallout onButtonClick={retry} error={error} />
      </EuiPageTemplate.EmptyPrompt>
    );
  }

  const shortcutsButton = (
    <NavIconButton
      iconType="keyboard"
      onClick={() => setIsShortcutsOpen(!isShortcutsOpen)}
      ariaLabel={MAIN_PANEL_LABELS.shortcutsButton}
      dataTestSubj="consoleShortcutsButton"
      toolTipContent={MAIN_PANEL_LABELS.shortcutsButton}
    />
  );

  const helpButton = (
    <NavIconButton
      iconType="questionInCircle"
      onClick={() => setIsHelpOpen(!isHelpOpen)}
      ariaLabel={MAIN_PANEL_LABELS.helpButton}
      dataTestSubj="consoleHelpButton"
      toolTipContent={MAIN_PANEL_LABELS.helpButton}
    />
  );

  return (
    <div
      id="consoleRoot"
      className={`consoleContainer${isEmbeddable ? '--embeddable' : ''}`}
      ref={setResizeRef}
    >
      <EuiScreenReaderOnly>
        <h1>{MAIN_PANEL_LABELS.consolePageHeading}</h1>
      </EuiScreenReaderOnly>
      <EuiSplitPanel.Outer grow={true} borderRadius={isEmbeddable ? 'none' : 'm'}>
        <EuiSplitPanel.Inner grow={false} className="consoleTabs">
          <EuiFlexGroup direction="row" alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <TopNavMenu
                disabled={!done}
                items={getTopNavConfig({
                  selectedTab: currentTab,
                  setSelectedTab: (tab) => updateTab(tab),
                })}
                tourStepProps={consoleTourStepProps}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ConsoleTourStep tourStepProps={consoleTourStepProps[FILES_TOUR_STEP - 1]}>
                <>
                  <EuiToolTip content={MAIN_PANEL_LABELS.exportButtonTooltip}>
                    <EuiButtonEmpty
                      iconType="exportAction"
                      onClick={() =>
                        downloadFileAs(EXPORT_FILE_NAME, {
                          content: inputEditorValue,
                          type: 'text/plain',
                        })
                      }
                      size="xs"
                      data-test-subj="consoleExportButton"
                    >
                      {MAIN_PANEL_LABELS.exportButton}
                    </EuiButtonEmpty>
                  </EuiToolTip>
                  <>
                    <EuiToolTip content={MAIN_PANEL_LABELS.importButtonTooltip}>
                      <EuiButtonEmpty
                        iconType="importAction"
                        onClick={() => document.getElementById('importConsoleFile')?.click()}
                        size="xs"
                        data-test-subj="consoleImportButton"
                      >
                        {MAIN_PANEL_LABELS.importButton}
                      </EuiButtonEmpty>
                    </EuiToolTip>
                    {/* This input is hidden by CSS in the UI, but the NavIcon button activates it */}
                    <input
                      type="file"
                      accept="text/*"
                      multiple={false}
                      name="consoleSnippets"
                      id="importConsoleFile"
                      onChange={onFileChange}
                    />
                  </>
                </>
              </ConsoleTourStep>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ShortcutsPopover
                button={shortcutsButton}
                isOpen={isShortcutsOpen}
                closePopover={() => setIsShortcutsOpen(false)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <HelpPopover
                button={helpButton}
                isOpen={isHelpOpen}
                closePopover={() => setIsHelpOpen(false)}
                resetTour={() => {
                  setIsHelpOpen(false);
                  updateTab(SHELL_TAB_ID);
                  actions.resetTour();
                }}
              />
            </EuiFlexItem>
            {isEmbeddable && (
              <EuiFlexItem grow={false}>
                <NavIconButton
                  iconType={isFullscreenOpen ? 'fullScreenExit' : 'fullScreen'}
                  onClick={toggleFullscreen}
                  ariaLabel={
                    isFullscreenOpen
                      ? MAIN_PANEL_LABELS.closeFullscrenButton
                      : MAIN_PANEL_LABELS.openFullscrenButton
                  }
                  dataTestSubj="consoleToggleFullscreenButton"
                  toolTipContent={
                    isFullscreenOpen
                      ? MAIN_PANEL_LABELS.closeFullscrenButton
                      : MAIN_PANEL_LABELS.openFullscrenButton
                  }
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" />
        <EuiSplitPanel.Inner paddingSize="none">
          {currentTab === SHELL_TAB_ID && (
            <Editor
              loading={!done}
              containerWidth={containerDimensions.width}
              inputEditorValue={inputEditorValue}
              setInputEditorValue={setInputEditorValue}
            />
          )}
          {currentTab === HISTORY_TAB_ID && <History containerWidth={containerDimensions.width} />}
          {currentTab === CONFIG_TAB_ID && <Config containerWidth={containerDimensions.width} />}
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" className="consoleVariablesBottomBar" />
        <EuiSplitPanel.Inner
          paddingSize="xs"
          grow={false}
          className="consoleVariablesBottomBar"
          color="plain"
        >
          <EuiButtonEmpty
            onClick={() => updateTab(CONFIG_TAB_ID)}
            iconType="editorCodeBlock"
            size="xs"
            color="text"
          >
            {MAIN_PANEL_LABELS.variablesButton}
          </EuiButtonEmpty>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>

      {/* Empty container for Editor Tour Step */}
      <ConsoleTourStep tourStepProps={consoleTourStepProps[EDITOR_TOUR_STEP - 1]}>
        <div />
      </ConsoleTourStep>
    </div>
  );
}
