/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiImage, EuiPageTemplate, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import lockDark from '../../assets/lock_dark.svg';
import lockLight from '../../assets/lock_light.svg';

const useEmptyPromptStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    .euiEmptyPrompt__main {
      width: 740px;
    }
    .euiEmptyPrompt__footer {
      border-top: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    }
  `;
};
export interface AccessDeniedProps {
  title: string;
  description: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode[];
  'data-test-subj'?: string;
}

export const AccessDenied = ({
  title,
  description,
  footer,
  actions,
  'data-test-subj': dataTestSubj,
}: AccessDeniedProps) => {
  const { colorMode } = useEuiTheme();
  const emptyPromptStyles = useEmptyPromptStyles();

  return (
    <EuiPageTemplate offset={0} paddingSize="none" grow>
      <EuiPageTemplate.Section
        grow
        css={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        data-test-subj={dataTestSubj}
      >
        <EuiEmptyPrompt
          data-test-subj="workflowsAccessDeniedEmptyState"
          hasShadow
          color="plain"
          paddingSize="l"
          css={emptyPromptStyles}
          icon={
            <EuiImage
              size="s"
              src={colorMode === 'LIGHT' ? lockLight : lockDark}
              alt={i18n.translate(
                'platform.plugins.shared.workflows_management.ui.accessDenied.illustrationAlt',
                { defaultMessage: 'Restricted access' }
              )}
            />
          }
          title={<h2>{title}</h2>}
          body={<p>{description}</p>}
          actions={actions}
          footer={footer}
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
