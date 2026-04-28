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
  EuiButtonEmpty,
  EuiPageTemplate,
  EuiSplitPanel,
  useEuiTour,
  EuiHorizontalRule,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getConsoleTourStepProps } from './get_console_tour_step_props';
import { useServicesContext } from '../../contexts';
import { MAIN_PANEL_LABELS } from './i18n';
import { NavIconButton } from './nav_icon_button';
import { Editor } from '../editor';
import { VariablesFlyout } from '../config/variables_flyout';
import { SettingsFlyout } from '../config/settings_flyout';
import { useEditorReadContext, useRequestActionContext } from '../../contexts';
import type { ConsoleTourStepProps } from '../../components';
import {
  SomethingWentWrongCallout,
  HelpPopover,
  ShortcutsPopover,
  ConsoleTourStep,
} from '../../components';
import { HistoryFlyout } from '../history/history_flyout';
import { useDataInit } from '../../hooks';
import { getTourSteps } from './get_tour_steps';
// todo remove SHELL_TAB_ID from constants and use currentView instead
import { SHELL_TAB_ID, EDITOR_TOUR_STEP, INITIAL_TOUR_CONFIG, FILES_TOUR_STEP } from './constants';
import { useMainStyles } from './main_styles';

interface MainProps {
  currentTabProp?: string;
  isEmbeddable?: boolean;
}

export function Main({ currentTabProp, isEmbeddable = false }: MainProps) {
  const requestDispatch = useRequestActionContext();
  const { currentView } = useEditorReadContext();
  const currentTab = currentTabProp ?? currentView;
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFullscreenOpen, setIsFullScreen] = useState(false);
  const [isVariablesFlyoutOpen, setIsVariablesFlyoutOpen] = useState(false);
  const [isSettingsFlyoutOpen, setIsSettingsFlyoutOpen] = useState(false);
  const [isHistoryFlyoutOpen, setIsHistoryFlyoutOpen] = useState(false);
  const styles = useMainStyles(isEmbeddable);

  const { docLinks } = useServicesContext();

  const [tourStepProps, actions, tourState] = useEuiTour(
    getTourSteps(docLinks),
    INITIAL_TOUR_CONFIG
  );

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

  if (!currentTextObject) return null;

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
      iconType="question"
      onClick={() => setIsHelpOpen(!isHelpOpen)}
      ariaLabel={MAIN_PANEL_LABELS.helpButton}
      dataTestSubj="consoleHelpButton"
      toolTipContent={MAIN_PANEL_LABELS.helpButton}
    />
  );

  return (
    <div id="consoleRoot" css={styles.consoleContainer}>
      <EuiScreenReaderOnly>
        <h1>{MAIN_PANEL_LABELS.consolePageHeading}</h1>
      </EuiScreenReaderOnly>
      <EuiSplitPanel.Outer grow={true} borderRadius={isEmbeddable ? 'none' : 'm'}>
        <EuiSplitPanel.Inner
          paddingSize="none"
          css={styles.scrollablePanelWithBackground}
          data-test-subj="consolePanel"
        >
          {currentTab === SHELL_TAB_ID && (
            <Editor
              loading={!done}
              inputEditorValue={inputEditorValue}
              setInputEditorValue={(val) => {
                setInputEditorValue(val);
              }}
              isFullscreenOpen={isFullscreenOpen}
              toggleFullscreen={toggleFullscreen}
              filesTourStepProps={consoleTourStepProps[FILES_TOUR_STEP - 1]}
            />
          )}
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" />
        <EuiSplitPanel.Inner
          paddingSize="xs"
          grow={false}
          data-test-subj="console-variables-bottom-bar"
          color="plain"
        >
          <EuiFlexGroup
            gutterSize="s"
            responsive={false}
            alignItems="center"
            justifyContent="spaceBetween"
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={() => setIsHistoryFlyoutOpen(true)}
                    size="xs"
                    color="text"
                    data-test-subj="consoleHistoryButton"
                    aria-label={i18n.translate('console.topNav.historyTabLabel', {
                      defaultMessage: 'History',
                    })}
                  >
                    {i18n.translate('console.topNav.historyTabLabel', {
                      defaultMessage: 'History',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={() => setIsSettingsFlyoutOpen(true)}
                    size="xs"
                    color="text"
                    data-test-subj="consoleConfigButton"
                    aria-label={i18n.translate('console.topNav.configTabLabel', {
                      defaultMessage: 'Config',
                    })}
                  >
                    {i18n.translate('console.topNav.configTabLabel', {
                      defaultMessage: 'Config',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={() => setIsVariablesFlyoutOpen(true)}
                    iconType="code"
                    size="xs"
                    color="text"
                    aria-label={MAIN_PANEL_LABELS.variablesButton}
                  >
                    {MAIN_PANEL_LABELS.variablesButton}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
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
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>

      {isVariablesFlyoutOpen && (
        <VariablesFlyout
          onClose={() => {
            setIsVariablesFlyoutOpen(false);
          }}
        />
      )}

      {isSettingsFlyoutOpen && (
        <SettingsFlyout
          onClose={() => {
            setIsSettingsFlyoutOpen(false);
          }}
        />
      )}

      {isHistoryFlyoutOpen && (
        <HistoryFlyout
          onClose={() => {
            setIsHistoryFlyoutOpen(false);
          }}
        />
      )}

      {/* Empty container for Editor Tour Step */}
      <ConsoleTourStep tourStepProps={consoleTourStepProps[EDITOR_TOUR_STEP - 1]}>
        <div />
      </ConsoleTourStep>
    </div>
  );
}
