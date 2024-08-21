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
} from '@elastic/eui';
import { EuiTourState } from '@elastic/eui/src/components/tour/types';
import { Editor } from '../editor';
import { TopNavMenu, SomethingWentWrongCallout } from '../../components';
import { useDataInit } from '../../hooks';
import { getTopNavConfig } from './get_top_nav';
import { getTourSteps } from './get_tour_steps';
import { SHELL_TAB_ID } from './tab_ids';

interface MainProps {
  isEmbeddable?: boolean;
}

const STORAGE_KEY = 'consoleTour';

const initialTourConfig: EuiTourState = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 360,
  tourSubtitle: 'Demo tour',
};

export function Main({ isEmbeddable = false }: MainProps) {
  const [selectedTab, setSelectedTab] = useState(SHELL_TAB_ID);

  const storageState = localStorage.getItem(STORAGE_KEY);
  const state = storageState ? (JSON.parse(storageState) as EuiTourState) : initialTourConfig;

  const [tourStepProps, actions, reducerState] = useEuiTour(getTourSteps(), state);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reducerState));
  }, [reducerState]);

  const nextTourStep = () => {
    if (reducerState.currentTourStep < 5) {
      actions.incrementStep();
    }
  };

  const fullTourStepProps = tourStepProps.map((step) => {
    return {
      ...step,
      onFinish: () => actions.finishTour(),
      isStepOpen: step.step === reducerState.currentTourStep,
      footerAction:
        reducerState.currentTourStep === tourStepProps.length - 1 ? (
          <EuiButton color="success" size="s" onClick={() => actions.finishTour()}>
            Finish tour
          </EuiButton>
        ) : (
          [
            <EuiButtonEmpty size="s" color="text" onClick={() => actions.finishTour()}>
              Close tour
            </EuiButtonEmpty>,
            <EuiButton color="success" size="s" onClick={nextTourStep}>
              Next
            </EuiButton>,
          ]
        ),
    };
  });

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
            <h1>
              {i18n.translate('console.pageHeading', {
                defaultMessage: 'Console',
              })}
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSplitPanel.Outer grow={true} borderRadius={isEmbeddable ? 'none' : 'm'}>
            <EuiSplitPanel.Inner grow={false} className="consoleTabs">
              <TopNavMenu
                disabled={!done}
                items={getTopNavConfig({
                  selectedTab,
                  setSelectedTab,
                })}
                tourStepProps={fullTourStepProps}
              />
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner paddingSize="none">
              {selectedTab === SHELL_TAB_ID && (
                <Editor
                  loading={!done}
                  setEditorInstance={() => {}}
                  tourStepProps={fullTourStepProps[1]}
                />
              )}
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
