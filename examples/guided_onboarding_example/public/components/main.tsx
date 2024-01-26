/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from '@kbn/core/public';
import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPageSection,
  EuiPageHeader,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiSelectOption,
  EuiFlexGrid,
} from '@elastic/eui';
import type { GuideState, GuideStepIds, GuideId, GuideStep } from '@kbn/guided-onboarding';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';

interface MainProps {
  guidedOnboarding?: GuidedOnboardingPluginStart;
  notifications: CoreStart['notifications'];
}

const exampleGuideIds: GuideId[] = [
  'appSearch',
  'websiteSearch',
  'databaseSearch',
  'siem',
  'kubernetes',
  'testGuide',
];
const selectOptions: EuiSelectOption[] = exampleGuideIds.map((guideId) => ({
  value: guideId,
  text: guideId,
}));
export const Main = (props: MainProps) => {
  const { guidedOnboarding, notifications } = props;
  const history = useHistory();
  const [guidesState, setGuidesState] = useState<GuideState[] | undefined>(undefined);
  const [activeGuide, setActiveGuide] = useState<GuideState | undefined>(undefined);

  const [selectedGuide, setSelectedGuide] = useState<GuideId | undefined>('kubernetes');
  const [selectedStep, setSelectedStep] = useState<GuideStepIds | undefined>(undefined);

  useEffect(() => {
    const fetchGuidesState = async () => {
      const newGuidesState = await guidedOnboarding?.guidedOnboardingApi?.fetchAllGuidesState();
      setGuidesState(newGuidesState ? newGuidesState.state : []);
    };

    fetchGuidesState();
  }, [guidedOnboarding]);

  useEffect(() => {
    const newActiveGuide = guidesState?.find((guide) => guide.isActive === true);
    if (newActiveGuide) {
      setActiveGuide(newActiveGuide);
    }
  }, [guidesState, setActiveGuide]);

  const activateGuide = async (guideId: GuideId, guideState?: GuideState) => {
    const response = await guidedOnboarding?.guidedOnboardingApi?.activateGuide(
      guideId,
      guideState
    );

    if (response) {
      notifications.toasts.addSuccess(
        i18n.translate('guidedOnboardingExample.startGuide.toastLabel', {
          defaultMessage: 'Guide (re-)started',
        })
      );
    }
  };

  const updateGuideState = async () => {
    if (!selectedGuide) {
      return;
    }

    const selectedGuideConfig = await guidedOnboarding?.guidedOnboardingApi?.getGuideConfig(
      selectedGuide
    );

    if (!selectedGuideConfig) {
      return;
    }
    const selectedStepIndex = selectedGuideConfig.steps.findIndex(
      (step) => step.id === selectedStep!
    );

    // Noop if the selected step is invalid
    if (selectedStepIndex === -1) {
      return;
    }

    const updatedSteps: GuideStep[] = selectedGuideConfig.steps.map((step, stepIndex) => {
      if (selectedStepIndex > stepIndex) {
        return {
          id: step.id,
          status: 'complete',
        };
      }

      if (selectedStepIndex < stepIndex) {
        return {
          id: step.id,
          status: 'inactive',
        };
      }

      return {
        id: step.id,
        status: 'active',
      };
    });

    const updatedGuideState: GuideState = {
      isActive: true,
      status: 'in_progress',
      steps: updatedSteps,
      guideId: selectedGuide!,
    };

    const response = await guidedOnboarding?.guidedOnboardingApi?.updatePluginState(
      { status: 'in_progress', guide: updatedGuideState },
      true
    );
    if (response) {
      notifications.toasts.addSuccess(
        i18n.translate('guidedOnboardingExample.updateGuideState.toastLabel', {
          defaultMessage: 'Guide state updated',
        })
      );
    }
  };

  return (
    <>
      <EuiPageHeader>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="guidedOnboardingExample.main.title"
              defaultMessage="Guided setup state"
            />
          </h2>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageSection>
        <EuiText>
          <h3>
            <FormattedMessage
              id="guidedOnboardingExample.main.currentStateTitle"
              defaultMessage="Current state"
            />
          </h3>
          <p>
            <FormattedMessage
              id="guidedOnboardingExample.guidesSelection.state.explanation"
              defaultMessage="The guide state on this page is updated automatically via an Observable subscription,
              so there is no need to 'load' the state from the server."
            />
          </p>
          {activeGuide ? (
            <dl>
              <dt>
                <FormattedMessage
                  id="guidedOnboardingExample.guidesSelection.state.activeGuideLabel"
                  defaultMessage="Active guide"
                />
              </dt>
              <dd>{activeGuide.guideId}</dd>

              <dt>
                <FormattedMessage
                  id="guidedOnboardingExample.guidesSelection.state.activeStepLabel"
                  defaultMessage="Steps status"
                />
              </dt>
              <dd>
                {activeGuide.steps.map((step) => {
                  return (
                    <>
                      {`Step "${step.id}": ${step.status}`} <br />
                    </>
                  );
                })}
              </dd>
            </dl>
          ) : (
            <p>
              <FormattedMessage
                id="guidedOnboardingExample.guidesSelection.state.noActiveGuidesMessage"
                defaultMessage="There are currently no active guides."
              />
            </p>
          )}
        </EuiText>
        <EuiHorizontalRule />
        <EuiText>
          <h3>
            <FormattedMessage
              id="guidedOnboardingExample.main.startGuide.title"
              defaultMessage="Guides"
            />
          </h3>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGrid columns={3}>
          {exampleGuideIds.map((guideId) => {
            const guideState = guidesState?.find((guide) => guide.guideId === guideId);
            return (
              <EuiFlexItem>
                <EuiButton
                  onClick={() => activateGuide(guideId, guideState)}
                  fill
                  disabled={guideState?.status === 'complete'}
                >
                  {guideState === undefined && (
                    <FormattedMessage
                      id="guidedOnboardingExample.guidesSelection.startButtonLabel"
                      defaultMessage="Start {guideId} guide"
                      values={{
                        guideId,
                      }}
                    />
                  )}
                  {(guideState?.isActive === true ||
                    guideState?.status === 'in_progress' ||
                    guideState?.status === 'ready_to_complete' ||
                    guideState?.status === 'not_started') && (
                    <FormattedMessage
                      id="guidedOnboardingExample.guidesSelection.continueButtonLabel"
                      defaultMessage="Continue {guideId} guide"
                      values={{
                        guideId,
                      }}
                    />
                  )}
                  {guideState?.status === 'complete' && (
                    <FormattedMessage
                      id="guidedOnboardingExample.guidesSelection.completeButtonLabel"
                      defaultMessage="Guide {guideId} complete"
                      values={{
                        guideId,
                      }}
                    />
                  )}
                </EuiButton>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGrid>
        <EuiSpacer />
        <EuiHorizontalRule />
        <EuiText>
          <h3>
            <FormattedMessage
              id="guidedOnboardingExample.main.setGuideState.title"
              defaultMessage="Set guide state"
            />
          </h3>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Guide" helpText="Select a guide">
              <EuiSelect
                id="guideSelect"
                options={selectOptions}
                value={selectedGuide}
                onChange={(e) => {
                  const value = e.target.value as GuideId;
                  const shouldResetState = value.trim().length === 0;
                  if (shouldResetState) {
                    setSelectedGuide(undefined);
                    setSelectedStep(undefined);
                  } else {
                    setSelectedGuide(value);
                  }
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Step ID">
              <EuiFieldText
                value={selectedStep}
                onChange={(e) => setSelectedStep(e.target.value as GuideStepIds)}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButton onClick={updateGuideState}>Save</EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiHorizontalRule />
        <EuiText>
          <h3>
            <FormattedMessage
              id="guidedOnboardingExample.main.examplePages.title"
              defaultMessage="Example pages for test guide"
            />
          </h3>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => history.push('stepOne')}>
              <FormattedMessage
                id="guidedOnboardingExample.main.examplePages.stepOne.link"
                defaultMessage="Step 1"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => history.push('stepTwo')}>
              <FormattedMessage
                id="guidedOnboardingExample.main.examplePages.stepTwo.link"
                defaultMessage="Step 2"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => history.push('stepThree')}>
              <FormattedMessage
                id="guidedOnboardingExample.main.examplePages.stepThree.link"
                defaultMessage="Step 3"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => history.push('stepFour')}>
              <FormattedMessage
                id="guidedOnboardingExample.main.examplePages.stepFour.link"
                defaultMessage="Step 4"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>
    </>
  );
};
