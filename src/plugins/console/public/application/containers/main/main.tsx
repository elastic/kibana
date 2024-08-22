/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiPageTemplate,
  EuiSplitPanel,
  useEuiTour,
  EuiButton,
  EuiButtonEmpty,
  EuiTourStep,
  EuiTourStepProps,
  EuiHorizontalRule,
} from '@elastic/eui';
import { MAIN_PANEL_LABELS } from './i18n';
import { NavIconButton } from './nav_icon_button';
import { Editor } from '../editor';
import { TopNavMenu, SomethingWentWrongCallout } from '../../components';
import { useDataInit } from '../../hooks';
import { getTopNavConfig } from './get_top_nav';
import { getTourSteps } from './get_tour_steps';
import {
  SHELL_TAB_ID,
  SHELL_TOUR_STEP_INDEX,
  EDITOR_TOUR_STEP_INDEX,
  TOUR_STORAGE_KEY,
  INITIAL_TOUR_CONFIG,
} from './constants';

interface MainProps {
  isEmbeddable?: boolean;
}

export function Main({ isEmbeddable = false }: MainProps) {
  const [selectedTab, setSelectedTab] = useState(SHELL_TAB_ID);

  const storageTourState = localStorage.getItem(TOUR_STORAGE_KEY);
  const initialTourState = storageTourState ? JSON.parse(storageTourState) : INITIAL_TOUR_CONFIG;
  const [tourStepProps, actions, tourState] = useEuiTour(getTourSteps(), initialTourState);

  useEffect(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(tourState));
  }, [tourState]);

  const nextTourStep = () => {
    if (tourState.currentTourStep < 5) {
      actions.incrementStep();
    }
  };

  const fullTourStepProps = tourStepProps.map((step: EuiTourStepProps) => {
    return {
      ...step,
      onFinish: () => actions.finishTour(false),
      subtitle: undefined, // Overwrite subtitle from initial tour config
      footerAction:
        // TODO: Fix the index after adding the tour step for files
        tourState.currentTourStep === tourStepProps.length - 1 ? (
          <EuiButton
            color="success"
            size="s"
            onClick={() => actions.finishTour()}
            data-test-subj="consoleCompleteTourButton"
          >
            {i18n.translate('console.tour.completeTourButton', {
              defaultMessage: 'Complete',
            })}
          </EuiButton>
        ) : (
          [
            <EuiButtonEmpty
              size="s"
              color="text"
              onClick={() => actions.finishTour()}
              data-test-subj="consoleSkipTourButton"
            >
              {i18n.translate('console.tour.skipTourButton', {
                defaultMessage: 'Skip tour',
              })}
            </EuiButtonEmpty>,
            <EuiButton
              color="success"
              size="s"
              onClick={nextTourStep}
              data-test-subj="consoleNextTourStepButton"
            >
              {i18n.translate('console.tour.nextStepButton', {
                defaultMessage: 'Next',
              })}
            </EuiButton>,
          ]
        ),
    };
  }) as EuiTourStepProps[];

  const { done, error, retry } = useDataInit();

  if (error) {
    return (
      <EuiPageTemplate.EmptyPrompt color="danger">
        <SomethingWentWrongCallout onButtonClick={retry} error={error} />
      </EuiPageTemplate.EmptyPrompt>
    );
  }

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
                  selectedTab,
                  setSelectedTab,
                })}
                tourStepProps={fullTourStepProps}
              />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <NavIconButton
                    iconType="save"
                    onClick={() => {}}
                    ariaLabel={MAIN_PANEL_LABELS.importExportButton}
                    dataTestSubj="consoleImportExportButton"
                    toolTipContent={MAIN_PANEL_LABELS.importExportButton}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <NavIconButton
                    iconType="keyboard"
                    onClick={() => {}}
                    ariaLabel={MAIN_PANEL_LABELS.shortcutsButton}
                    dataTestSubj="consoleShortcutsButton"
                    toolTipContent={MAIN_PANEL_LABELS.shortcutsButton}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <NavIconButton
                    iconType="questionInCircle"
                    onClick={() => {}}
                    ariaLabel={MAIN_PANEL_LABELS.helpButton}
                    dataTestSubj="consoleHelpButton"
                    toolTipContent={MAIN_PANEL_LABELS.helpButton}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiSplitPanel.Inner>
            <EuiHorizontalRule margin="none" />
            <EuiSplitPanel.Inner paddingSize="none">
              {selectedTab === SHELL_TAB_ID && (
                <Editor
                  loading={!done}
                  setEditorInstance={() => {}}
                  tourStepProps={fullTourStepProps[SHELL_TOUR_STEP_INDEX]}
                />
              )}
            </EuiSplitPanel.Inner>
            <EuiHorizontalRule margin="none" />
            <EuiSplitPanel.Inner paddingSize="xs" grow={false}>
              <EuiButtonEmpty onClick={() => {}} iconType="editorCodeBlock" size="xs" color="text">
                {MAIN_PANEL_LABELS.variablesButton}
              </EuiButtonEmpty>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Fixed Position Container for Tour Step */}
      <div className="tourStepFixedContainer">
        <EuiTourStep
          {...fullTourStepProps[EDITOR_TOUR_STEP_INDEX]}
          anchor=".tourStepFixedContainer"
        />
      </div>
    </div>
  );
}
