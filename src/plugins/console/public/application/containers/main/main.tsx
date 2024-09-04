/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiPageTemplate,
  EuiSplitPanel,
  useEuiTour,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiToolTip,
} from '@elastic/eui';
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
  isEmbeddable?: boolean;
}

export function Main({ isEmbeddable = false }: MainProps) {
  const dispatch = useEditorActionContext();
  const requestDispatch = useRequestActionContext();
  const { currentView } = useEditorReadContext();
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFullscreenOpen, setIsFullScreen] = useState(false);

  const { docLinks } = useServicesContext();

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
    tourState,
    currentView
  );

  const { done, error, retry } = useDataInit();

  const { currentTextObject } = useEditorReadContext();
  const [inputEditorValue, setInputEditorValue] = useState<string>(currentTextObject?.text ?? '');

  const toggleFullscreen = () => {
    const isEnabled = !isFullscreenOpen;

    setIsFullScreen(isEnabled);

    if (isEnabled) {
      document.querySelector('#consoleRoot')?.requestFullscreen();
    } else {
      document.exitFullscreen();
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
    <div id="consoleRoot">
      <EuiFlexGroup
        className={`consoleContainer${isEmbeddable ? '--embeddable' : ''}`}
        gutterSize="m"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle className="euiScreenReaderOnly">
            <h1>{MAIN_PANEL_LABELS.consolePageHeading}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSplitPanel.Outer grow={true} borderRadius={isEmbeddable ? 'none' : 'm'}>
            <EuiSplitPanel.Inner grow={false} className="consoleTabs">
              <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
                <EuiFlexItem>
                  <TopNavMenu
                    disabled={!done}
                    items={getTopNavConfig({
                      selectedTab: currentView,
                      setSelectedTab: (tab) => dispatch({ type: 'setCurrentView', payload: tab }),
                    })}
                    tourStepProps={consoleTourStepProps}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ConsoleTourStep tourStepProps={consoleTourStepProps[FILES_TOUR_STEP - 1]}>
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
              {currentView === SHELL_TAB_ID && (
                <Editor
                  loading={!done}
                  setEditorInstance={() => {}}
                  inputEditorValue={inputEditorValue}
                  setInputEditorValue={setInputEditorValue}
                />
              )}
              {currentView === HISTORY_TAB_ID && <History />}
              {currentView === CONFIG_TAB_ID && <Config editorInstance={null} />}
            </EuiSplitPanel.Inner>
            <EuiHorizontalRule margin="none" />
            <EuiSplitPanel.Inner paddingSize="xs" grow={false}>
              <EuiButtonEmpty
                onClick={() => dispatch({ type: 'setCurrentView', payload: CONFIG_TAB_ID })}
                iconType="editorCodeBlock"
                size="xs"
                color="text"
              >
                {MAIN_PANEL_LABELS.variablesButton}
              </EuiButtonEmpty>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Empty container for Editor Tour Step */}
      <ConsoleTourStep tourStepProps={consoleTourStepProps[EDITOR_TOUR_STEP - 1]}>
        <div />
      </ConsoleTourStep>
    </div>
  );
}
