/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
  EuiHorizontalRule,
  EuiTourStep,
} from '@elastic/eui';

import { CoreStart } from '@kbn/core/public';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

import {
  GuidedOnboardingPluginStart,
  GuidedOnboardingState,
  UseCase,
} from '@kbn/guided-onboarding-plugin/public/types';

interface GuidedOnboardingExampleAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
  guidedOnboarding: GuidedOnboardingPluginStart;
}

export const StepOne = ({
  notifications,
  http,
  guidedOnboarding,
}: GuidedOnboardingExampleAppDeps) => {
  const { guidedOnboardingApi } = guidedOnboarding;

  const [selectedGuide, setSelectedGuide] = useState<UseCase | undefined>(undefined);
  const [selectedStep, setSelectedStep] = useState<string | undefined>(undefined);
  const [isTourStepOpen, setIsTourStepOpen] = useState(true);

  const getDataRequest = () => {
    http.get<{ state: GuidedOnboardingState }>('/api/guided_onboarding/state').then((res) => {
      notifications.toasts.addSuccess(
        i18n.translate('guidedOnboarding.dataUpdated', {
          defaultMessage: 'Data loaded',
        })
      );
      setSelectedGuide(res.state.active_guide);
      setSelectedStep(res.state.active_step);
    });
  };

  const sendUpdateRequest = async () => {
    const response = await guidedOnboardingApi.updateGuideState({
      active_guide: selectedGuide,
      active_step: selectedStep,
    });

    if (response) {
      notifications.toasts.addSuccess(
        i18n.translate('guidedOnboardingExample.dataUpdated', {
          defaultMessage: 'Data updated',
        })
      );
    }
  };

  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="guidedOnboardingExample.timestampText"
            defaultMessage="State: {state}"
            values={{
              state: `guide: ${selectedGuide}, step: ${selectedStep}` ?? 'Unknown',
            }}
          />
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiButton type="primary" size="s" onClick={getDataRequest}>
        <FormattedMessage id="guidedOnboardingExample.buttonText" defaultMessage="Get data" />
      </EuiButton>
      <EuiSpacer />
      <EuiFlexGroup style={{ maxWidth: 600 }}>
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
            <EuiButton onClick={sendUpdateRequest}>Save</EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Sample step */}
      <EuiHorizontalRule />
      <EuiText>
        <p>Sample step</p>
      </EuiText>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiTourStep
            content={
              <EuiText>
                <p>Click this button to complete step 1.</p>
              </EuiText>
            }
            isStepOpen={isTourStepOpen}
            minWidth={300}
            onFinish={() => setIsTourStepOpen(false)}
            step={1}
            stepsTotal={1}
            title="Step 1"
            anchorPosition="rightUp"
          >
            <EuiButton
              onClick={async () => {
                await guidedOnboardingApi.updateGuideState({
                  active_guide: 'search',
                  active_step: '2',
                });
              }}
            >
              Complete step 1
            </EuiButton>
          </EuiTourStep>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
