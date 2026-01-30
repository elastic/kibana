/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ChangeEvent, useState, useEffect, useCallback } from 'react';
import type { ApplicationStart, CoreAuthenticationService } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FeedbackHeader } from './feedback_header';
import { FeedbackBody } from './feedback_body';
import { FeedbackFooter } from './feedback_footer';

interface Props {
  getCurrentUser: CoreAuthenticationService['getCurrentUser'];
  getLicense: LicensingPluginStart['getLicense'];
  currentAppId$: ApplicationStart['currentAppId$'];
}

export const FeedbackForm = ({ getCurrentUser, getLicense, currentAppId$ }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [feedbackText, setFeedbackText] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [currentAppId, setCurrentAppId] = useState<string | undefined>('');

  const isSendFeedbackButtonDisabled = !feedbackText.trim().length;

  const getEmail = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    } catch (_) {
      setUserEmail('');
    }
  }, [getCurrentUser]);

  useEffect(() => {
    getEmail();
  }, [getEmail]);

  useEffect(() => {
    const subscription = currentAppId$.subscribe((id) => {
      setCurrentAppId(id);
    });
    return () => {
      setCurrentAppId(undefined);
      subscription.unsubscribe();
    };
  }, [currentAppId$]);

  const handleChangeFeedbackText = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setFeedbackText(e.target.value);
  };

  const handleChangeEmail = (e: ChangeEvent<HTMLInputElement>) => {
    setUserEmail(e.target.value);
  };

  const submitFeedback = () => {
    // TODO
  };

  const formCss = css`
    padding: ${euiTheme.size.l};
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="feedbackForm" css={formCss}>
      <FeedbackHeader />
      <FeedbackBody
        feedbackText={feedbackText}
        userEmail={userEmail}
        currentAppId={currentAppId}
        handleChangeFeedbackText={handleChangeFeedbackText}
        handleChangeEmail={handleChangeEmail}
        getLicense={getLicense}
      />
      <FeedbackFooter
        isSendFeedbackButtonDisabled={isSendFeedbackButtonDisabled}
        submitFeedback={submitFeedback}
      />
    </EuiFlexGroup>
  );
};
