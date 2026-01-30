/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useEffect, type ChangeEvent } from 'react';
import {
  EuiFieldText,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useEuiTheme,
} from '@elastic/eui';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { ILicense } from '@kbn/licensing-types';
import type { CoreStart } from '@kbn/core/public';
import { FormLabel } from './form_label';
import { CsatButtons } from './csat_buttons';
import { BenefitsCallout } from './benefits_callout';

interface Props {
  core: CoreStart;
  feedbackText: string;
  userEmail: string;
  handleChangeFeedbackText: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleChangeEmail: (e: ChangeEvent<HTMLInputElement>) => void;
  getLicense: LicensingPluginStart['getLicense'];
}
export const FeedbackBody = ({
  core,
  feedbackText,
  userEmail,
  getLicense,
  handleChangeFeedbackText,
  handleChangeEmail,
}: Props) => {
  const [license, setLicense] = useState<ILicense | undefined>(undefined);
  const { euiTheme } = useEuiTheme();

  const getLicenseInfo = useCallback(async () => {
    try {
      const licenseInfo = await getLicense();
      setLicense(licenseInfo);
    } catch (_) {
      setLicense(undefined);
    }
  }, [getLicense]);

  useEffect(() => {
    getLicenseInfo();
  }, [getLicenseInfo]);

  const licenseType = license?.type;

  const showBenefitsCallout =
    license?.hasAtLeast('platinum') && licenseType !== 'trial' && licenseType !== undefined;

  const bodyCss = css`
    padding-top: ${euiTheme.size.m};
  `;

  const formCss = css`
    width: 600px;
  `;

  return (
    <EuiFlexItem css={bodyCss} data-test-subj="feedbackFormBody">
      <EuiForm component="form" css={formCss}>
        <CsatButtons core={core} />
        <EuiSpacer size="m" />
        {showBenefitsCallout && <BenefitsCallout licenseType={licenseType} />}
        <EuiFormRow fullWidth>
          <EuiTextArea
            fullWidth
            data-test-subj="feedbackFormTextArea"
            value={feedbackText}
            aria-label={i18n.translate('feedback.form.body.textArea.ariaLabel', {
              defaultMessage: 'Describe your experience',
            })}
            onChange={handleChangeFeedbackText}
            placeholder={i18n.translate('feedback.form.body.textArea.placeholder', {
              defaultMessage: 'Describe your experience',
            })}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={
            <FormLabel>
              <FormattedMessage
                id="feedback.form.body.additionalFeedback.label"
                defaultMessage="Anything else you would like to share about Elastic overall?"
              />
            </FormLabel>
          }
        >
          <EuiTextArea
            fullWidth
            data-test-subj="feedbackFormTextArea"
            value={feedbackText}
            aria-label={i18n.translate('feedback.form.body.textArea.ariaLabel', {
              defaultMessage: 'Describe your experience',
            })}
            onChange={handleChangeFeedbackText}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={
            <FormLabel>
              <FormattedMessage
                id="feedback.form.body.emailInput.label"
                defaultMessage="Your email"
              />
            </FormLabel>
          }
          labelAppend={
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="feedback.form.body.emailInput.optionalText"
                defaultMessage="Optional"
              />
            </EuiText>
          }
        >
          <EuiFieldText
            fullWidth
            data-test-subj="feedbackFormEmailInput"
            value={userEmail}
            aria-label={i18n.translate('feedback.form.body.emailInput.ariaLabel', {
              defaultMessage: 'Enter your email here',
            })}
            type="email"
            onChange={handleChangeEmail}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiFlexItem>
  );
};
