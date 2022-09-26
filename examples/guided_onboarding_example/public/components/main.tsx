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
  EuiPageContentBody_Deprecated as EuiPageContentBody,
  EuiPageContentHeader_Deprecated as EuiPageContentHeader,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  GuidedOnboardingPluginStart,
  GuidedOnboardingState,
  UseCase,
  guidesConfig,
} from '@kbn/guided-onboarding-plugin/public';

interface MainProps {
  guidedOnboarding: GuidedOnboardingPluginStart;
  notifications: CoreStart['notifications'];
}

export const Main = (props: MainProps) => {
  const {
    guidedOnboarding: { guidedOnboardingApi },
    notifications,
  } = props;
  const history = useHistory();
  const [guidesState, setGuidesState] = useState<GuidedOnboardingState[] | undefined>(undefined);
  const [activeGuide, setActiveGuide] = useState<GuidedOnboardingState | undefined>(undefined);

  const [selectedGuide, setSelectedGuide] = useState<UseCase | undefined>(undefined);
  const [selectedStep, setSelectedStep] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchGuidesState = async () => {
      // get the data from the api
      const { state: newGuidesState } = await guidedOnboardingApi?.fetchAllGuidesState();
      // set state with the result
      setGuidesState(newGuidesState);
    };

    // call the function
    fetchGuidesState();
  }, [guidedOnboardingApi]);

  // todo change this so subscription
  useEffect(() => {
    const newActiveGuide = guidesState?.find((guide) => guide.isActive === true);
    if (newActiveGuide) {
      setActiveGuide(newActiveGuide);
    }
  }, [guidesState, setActiveGuide]);

  // TODO fix TS
  const startGuide = async (guide: any, guideConfig: any) => {
    const response = await guidedOnboardingApi?.activateGuide(guideConfig, guide);

    if (response) {
      notifications.toasts.addSuccess(
        i18n.translate('guidedOnboardingExample.startGuide.toastLabel', {
          defaultMessage: 'Guide (re-)started',
        })
      );
    }
  };

  const updateGuideState = async () => {
    const response = await guidedOnboardingApi?.updateGuideState({
      activeGuide: selectedGuide!,
      activeStep: selectedStep!,
    });

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
      <EuiPageContentHeader>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="guidedOnboardingExample.main.title"
              defaultMessage="Guided setup state"
            />
          </h2>
        </EuiTitle>
      </EuiPageContentHeader>
      <EuiPageContentBody>
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
              defaultMessage="The guide state on this page is updated automatically via an Observable,
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
              <dd>{activeGuide.guideId ?? 'undefined'}</dd>

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
                      {`Step ${step.id}: ${step.status}`} <br />
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
        <EuiFlexGroup>
          {Object.keys(guidesConfig).map((guideId) => {
            const guideStatus = guidesState?.find((guide) => guide.guideId === guideId);
            const guideConfig = { ...guidesConfig[guideId], guideId };
            return (
              <EuiFlexItem>
                <EuiButton
                  onClick={() => startGuide(guideStatus, guideConfig)}
                  fill
                  disabled={guideStatus?.status === 'complete'}
                >
                  {guideStatus === undefined && (
                    <FormattedMessage
                      id="guidedOnboardingExample.guidesSelection.startButtonLabel"
                      defaultMessage="Start {guideId} guide"
                      values={{
                        guideId,
                      }}
                    />
                  )}
                  {(guideStatus?.isActive === true ||
                    guideStatus?.status === 'in_progress' ||
                    guideStatus?.status === 'ready_to_complete') && (
                    <FormattedMessage
                      id="guidedOnboardingExample.guidesSelection.continueButtonLabel"
                      defaultMessage="Continue {guideId} guide"
                      values={{
                        guideId,
                      }}
                    />
                  )}
                  {guideStatus?.status === 'complete' && (
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
        </EuiFlexGroup>
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
                id={'guideSelect'}
                options={[
                  { value: 'observability', text: 'observability' },
                  { value: 'security', text: 'security' },
                  { value: 'search', text: 'search' },
                  { value: '', text: 'unset' },
                ]}
                value={selectedGuide}
                onChange={(e) => {
                  const value = e.target.value as UseCase;
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
            <EuiFormRow label="Step">
              <EuiFieldText
                value={selectedStep}
                onChange={(e) => setSelectedStep(e.target.value)}
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
              defaultMessage="Example pages"
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
        </EuiFlexGroup>
      </EuiPageContentBody>
    </>
  );
};
