/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import { getCurrentAppTitle } from '../utils/get_current_app_title';
import { FormLabel } from './form_label';

const options = ({ htmlId }: { htmlId: string }) => [
  {
    id: `${htmlId}_1`,
    label: '1',
  },
  {
    id: `${htmlId}_2`,
    label: '2',
  },
  {
    id: `${htmlId}_3`,
    label: '3',
  },
  {
    id: `${htmlId}_4`,
    label: '4',
  },
  {
    id: `${htmlId}_5`,
    label: '5',
  },
];

interface Props {
  core: CoreStart;
}

export const CsatButtons = ({ core }: Props) => {
  const { euiTheme } = useEuiTheme();
  const basicButtonGroupPrefix = useGeneratedHtmlId({
    prefix: 'csat',
  });

  const [selectedOptionId, setSelectedOptionId] = useState('');

  const appTitle = getCurrentAppTitle(core.application);

  const handleChange = (optionId: string) => {
    setSelectedOptionId(optionId);
  };

  const labelsCss = css`
    color: ${euiTheme.colors.textSubdued};
  `;

  const rightLabelCss = css`
    text-align: right;
  `;

  return (
    <EuiFormRow
      fullWidth
      label={
        <FormLabel>
          <FormattedMessage
            id="feedback.form.body.csatButtons.label"
            defaultMessage="How would you rate your experience with {appTitle}?"
            values={{
              appTitle: appTitle
                ? appTitle
                : i18n.translate('feedback.csatButtons.defaultAppTitle', {
                    defaultMessage: 'Kibana',
                  }),
            }}
          />
        </FormLabel>
      }
    >
      <>
        <EuiButtonGroup
          options={options({ htmlId: basicButtonGroupPrefix })}
          legend={i18n.translate('feedback.csatButtons.legend', {
            defaultMessage: 'Customer satisfaction rating',
          })}
          type="single"
          onChange={handleChange}
          idSelected={selectedOptionId}
          isFullWidth={true}
          buttonSize="compressed"
        />
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" css={labelsCss}>
          <EuiFlexItem>
            <EuiText size="xs">
              {i18n.translate('feedback.csatButtons.notSatisfiedLabel', {
                defaultMessage: 'Very dissatisfied',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem css={rightLabelCss}>
            <EuiText size="xs">
              {i18n.translate('feedback.csatButtons.verySatisfiedLabel', {
                defaultMessage: 'Very satisfied',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    </EuiFormRow>
  );
};
