/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useState,
  useCallback,
  useEffect,
  type PropsWithChildren,
  type ChangeEvent,
} from 'react';
import {
  EuiFieldText,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSelect,
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
import { BenefitsCallout } from './benefits_callout';
import { ELASTIC_SUPPORT_URL, FEEDBACK_TYPE } from './constants';

const feedbackTypes = [
  {
    value: FEEDBACK_TYPE.FEATURE_REQUEST,
    text: (
      <FormattedMessage
        id="xpack.intercepts.feedbackFlyout.form.select.options.featureRequest"
        defaultMessage="Request a feature"
      />
    ),
  },
  {
    value: FEEDBACK_TYPE.ISSUE_REPORT,
    text: (
      <FormattedMessage
        id="xpack.intercepts.feedbackFlyout.form.select.options.issueReport"
        defaultMessage="Report an issue"
      />
    ),
  },
  {
    value: FEEDBACK_TYPE.OTHER_FEEDBACK,
    text: (
      <FormattedMessage
        id="xpack.intercepts.feedbackFlyout.form.select.options.otherFeedback"
        defaultMessage="Other feedback"
      />
    ),
  },
];

const getTextAreaLabel = (feedbackType: FEEDBACK_TYPE) => {
  if (feedbackType === FEEDBACK_TYPE.FEATURE_REQUEST) {
    return (
      <FormattedMessage
        id="xpack.intercepts.feedbackFlyout.form.textArea.featureRequestLabel"
        defaultMessage="Describe your idea"
      />
    );
  }
  if (feedbackType === FEEDBACK_TYPE.ISSUE_REPORT) {
    return (
      <FormattedMessage
        id="xpack.intercepts.feedbackFlyout.form.textArea.issueReportLabel"
        defaultMessage="Describe your issue"
      />
    );
  }
  return (
    <FormattedMessage
      id="xpack.intercepts.feedbackFlyout.form.textArea.otherFeedbackLabel"
      defaultMessage="Share your feedback"
    />
  );
};

interface Props {
  feedbackType: FEEDBACK_TYPE;
  feedbackText: string;
  userEmail: string;
  handleChangeFeedbackType: (e: ChangeEvent<HTMLSelectElement>) => void;
  handleChangeFeedbackText: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleChangeEmail: (e: ChangeEvent<HTMLInputElement>) => void;
  getLicense: LicensingPluginStart['getLicense'];
}
export const FeedbackFlyoutBody = ({
  feedbackType,
  feedbackText,
  userEmail,
  getLicense,
  handleChangeFeedbackType,
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
    license?.hasAtLeast('platinum') &&
    licenseType !== 'trial' &&
    licenseType !== undefined &&
    feedbackType !== FEEDBACK_TYPE.OTHER_FEEDBACK;

  const showSelectHelpText = !showBenefitsCallout && feedbackType === FEEDBACK_TYPE.ISSUE_REPORT;

  const semiBoldTextCss = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  const bodyCss = css`
    padding-top: ${euiTheme.size.m};
  `;

  const Label = ({ children }: PropsWithChildren) => (
    <EuiText size="xs" css={semiBoldTextCss}>
      {children}
    </EuiText>
  );

  return (
    <EuiFlexItem css={bodyCss} data-test-subj="feedbackFlyoutBody">
      <EuiForm component="form">
        <EuiFormRow
          helpText={
            showSelectHelpText && (
              <>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.intercepts.feedbackFlyout.form.select.issueReport.helpText.text"
                    defaultMessage="This form helps us collect general feedback about our products. If you need assistance, {supportLink} instead."
                    values={{
                      supportLink: (
                        <EuiLink href={ELASTIC_SUPPORT_URL} target="_blank" external={true}>
                          <FormattedMessage
                            id="xpack.intercepts.feedbackFlyout.issueReport.helpText.supportLink"
                            defaultMessage="submit a support request"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiText>
              </>
            )
          }
        >
          <EuiSelect
            data-test-subj="feedbackTypeSelect"
            options={feedbackTypes}
            value={feedbackType}
            aria-label={i18n.translate('xpack.intercepts.feedbackFlyout.form.select.ariaLabel', {
              defaultMessage: 'Select feedback type',
            })}
            onChange={handleChangeFeedbackType}
          />
        </EuiFormRow>
        {showBenefitsCallout && <BenefitsCallout licenseType={licenseType} />}
        <EuiFormRow
          label={<Label>{getTextAreaLabel(feedbackType)}</Label>}
          helpText={
            <>
              <EuiSpacer size="s" />
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.intercepts.feedbackFlyout.form.textArea.helpText"
                  defaultMessage="Please share your email so we can get in touch for possible follow-up questions:"
                />
              </EuiText>
            </>
          }
        >
          <EuiTextArea
            data-test-subj="feedbackTextArea"
            value={feedbackText}
            aria-label={i18n.translate('xpack.intercepts.feedbackFlyout.form.textArea.ariaLabel', {
              defaultMessage: 'Enter your feedback here',
            })}
            onChange={handleChangeFeedbackText}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <Label>
              <FormattedMessage
                id="xpack.intercepts.feedbackFlyout.form.emailInput.label"
                defaultMessage="Your email"
              />
            </Label>
          }
          labelAppend={
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.intercepts.feedbackFlyout.form.emailInput.optionalText"
                defaultMessage="Optional"
              />
            </EuiText>
          }
        >
          <EuiFieldText
            data-test-subj="feedbackEmailInput"
            value={userEmail}
            aria-label={i18n.translate(
              'xpack.intercepts.feedbackFlyout.form.emailInput.ariaLabel',
              {
                defaultMessage: 'Enter your email here',
              }
            )}
            type="email"
            onChange={handleChangeEmail}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiFlexItem>
  );
};
