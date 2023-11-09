/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useActor, useSelector } from '@xstate/react';
import React, { useCallback } from 'react';
import { isSubmittingSelector, isValidSelector } from '../../state_machines/create/selectors';
import { CreateCustomIntegrationActorRef } from '../../state_machines/create/state_machine';

const SUBMITTING_TEXT = i18n.translate('customIntegrationsPackage.create.button.submitting', {
  defaultMessage: 'Creating integration...',
});

const CONTINUE_TEXT = i18n.translate('customIntegrationsPackage.create.button.continue', {
  defaultMessage: 'Continue',
});

interface ConnectedCreateCustomIntegrationButtonProps {
  machine: CreateCustomIntegrationActorRef;
  isDisabled?: boolean;
  onClick?: () => void;
  submittingText?: string;
  continueText?: string;
  testSubj: string;
}
export const ConnectedCreateCustomIntegrationButton = ({
  machine,
  isDisabled = false,
  onClick: consumerOnClick,
  submittingText = SUBMITTING_TEXT,
  continueText = CONTINUE_TEXT,
  testSubj,
}: ConnectedCreateCustomIntegrationButtonProps) => {
  const [, send] = useActor(machine);

  const onClick = useCallback(() => {
    if (consumerOnClick) {
      consumerOnClick();
    }
    send({ type: 'SAVE' });
  }, [consumerOnClick, send]);

  const isValid = useSelector(machine, isValidSelector);
  const isSubmitting = useSelector(machine, isSubmittingSelector);

  return (
    <CreateCustomIntegrationButton
      onClick={onClick}
      isValid={isValid}
      isSubmitting={isSubmitting}
      isDisabled={isDisabled}
      submittingText={submittingText}
      continueText={continueText}
      testSubj={testSubj}
    />
  );
};

type CreateCustomIntegrationButtonProps = {
  isValid: boolean;
  isSubmitting: boolean;
} & Omit<ConnectedCreateCustomIntegrationButtonProps, 'machine'>;

const CreateCustomIntegrationButton = ({
  onClick,
  isValid,
  isSubmitting,
  isDisabled,
  submittingText,
  continueText,
  testSubj,
}: CreateCustomIntegrationButtonProps) => {
  return (
    <EuiButton
      data-test-subj={testSubj}
      color="primary"
      fill
      onClick={onClick}
      isLoading={isSubmitting}
      isDisabled={isDisabled || !isValid}
    >
      {isSubmitting ? submittingText : continueText}
    </EuiButton>
  );
};
