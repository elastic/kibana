/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSplitPanel,
  useEuiTour,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { getConsoleTourStepProps } from './get_console_tour_step_props';
import { useServicesContext } from '../../contexts';
import { MAIN_PANEL_LABELS } from './i18n';
import { NavIconButton } from './nav_icon_button';
import { Editor } from '../editor';
import { Config } from '../config';
import {
  TopNavMenu,
  SomethingWentWrongCallout,
  HelpPopover,
  ShortcutsPopover,
  ConsoleTourStep,
  ConsoleTourStepProps,
} from '../../components';
import { useDataInit } from '../../hooks';
import { getTopNavConfig } from './get_top_nav';
import { getTourSteps } from './get_tour_steps';
import {
  SHELL_TAB_ID,
  CONFIG_TAB_ID,
  EDITOR_TOUR_STEP,
  TOUR_STORAGE_KEY,
  INITIAL_TOUR_CONFIG,
  FILES_TOUR_STEP,
} from './constants';

interface MainProps {
  isEmbeddable?: boolean;
}

export function Main({ isEmbeddable = false }: MainProps) {
  const [selectedTab, setSelectedTab] = useState(SHELL_TAB_ID);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const { docLinks } = useServicesContext();

  const storageTourState = localStorage.getItem(TOUR_STORAGE_KEY);
  const initialTourState = storageTourState ? JSON.parse(storageTourState) : INITIAL_TOUR_CONFIG;
  const [tourStepProps, actions, tourState] = useEuiTour(getTourSteps(docLinks), initialTourState);

  useEffect(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(tourState));
  }, [tourState]);

  const consoleTourStepProps: ConsoleTourStepProps[] = getConsoleTourStepProps(
    tourStepProps,
    actions,
    tourState
  );

  const { done, error, retry } = useDataInit();

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
    <div id="consoleRoot" className={`consoleContainer${isEmbeddable ? '--embeddable' : ''}`}>
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
                  selectedTab,
                  setSelectedTab,
                })}
                tourStepProps={consoleTourStepProps}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ConsoleTourStep tourStepProps={consoleTourStepProps[FILES_TOUR_STEP - 1]}>
                <NavIconButton
                  iconType="save"
                  onClick={() => {}}
                  ariaLabel={MAIN_PANEL_LABELS.importExportButton}
                  dataTestSubj="consoleImportExportButton"
                  toolTipContent={MAIN_PANEL_LABELS.importExportButton}
                />
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
                resetTour={() => actions.resetTour()}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" />
        <EuiSplitPanel.Inner paddingSize="none">
          {selectedTab === SHELL_TAB_ID && <Editor loading={!done} setEditorInstance={() => {}} />}

          {selectedTab === CONFIG_TAB_ID && <Config editorInstance={null} />}
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" />
        <EuiSplitPanel.Inner paddingSize="xs" grow={false}>
          <EuiButtonEmpty
            onClick={() => setSelectedTab(CONFIG_TAB_ID)}
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
