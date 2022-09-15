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
import {
  EuiButton,
  EuiFieldNumber,
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
} from '@kbn/guided-onboarding-plugin/public';
import { CoreStart } from '@kbn/core/public';

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
  const [guideState, setGuideState] = useState<GuidedOnboardingState | undefined>(undefined);

  const [selectedGuide, setSelectedGuide] = useState<
    GuidedOnboardingState['activeGuide'] | undefined
  >(undefined);
  const [selectedStep, setSelectedStep] = useState<GuidedOnboardingState['activeStep'] | undefined>(
    undefined
  );

  useEffect(() => {
    const subscription = guidedOnboardingApi?.fetchGuideState$().subscribe((newState) => {
      setGuideState(newState);
    });
    return () => subscription?.unsubscribe();
  }, [guidedOnboardingApi]);

  const startGuide = async (guide: UseCase) => {
    const response = await guidedOnboardingApi?.updateGuideState({
      activeGuide: guide,
      activeStep: 'add_data',
    });

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
          {guideState ? (
            <dl>
              <dt>
                <FormattedMessage
                  id="guidedOnboardingExample.guidesSelection.state.activeGuideLabel"
                  defaultMessage="Active guide"
                />
              </dt>
              <dd>{guideState.activeGuide ?? 'undefined'}</dd>

              <dt>
                <FormattedMessage
                  id="guidedOnboardingExample.guidesSelection.state.activeStepLabel"
                  defaultMessage="Active step"
                />
              </dt>
              <dd>{guideState.activeStep ?? 'undefined'}</dd>
            </dl>
          ) : undefined}
        </EuiText>
        <EuiHorizontalRule />
        <EuiText>
          <h3>
            <FormattedMessage
              id="guidedOnboardingExample.main.startGuide.title"
              defaultMessage="(Re-)Start a guide"
            />
          </h3>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButton onClick={() => startGuide('search')} fill>
              <FormattedMessage
                id="guidedOnboardingExample.guidesSelection.search.buttonLabel"
                defaultMessage="(Re-)Start search guide"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton onClick={() => startGuide('observability')} fill>
              <FormattedMessage
                id="guidedOnboardingExample.guidesSelection.observability.buttonLabel"
                defaultMessage="(Re-)Start observability guide"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton onClick={() => startGuide('security')} fill>
              <FormattedMessage
                id="guidedOnboardingExample.guidesSelection.security.label"
                defaultMessage="(Re-)Start security guide"
              />
            </EuiButton>
          </EuiFlexItem>
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
              <EuiFieldNumber
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
