/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiImage,
  EuiPageTemplate,
  EuiPanel,
  EuiText,
  type EuiThemeComputed,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useWorkflowsBreadcrumbs } from '../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs';

const PROMPT_MAX_WIDTH_PX = 740;
const LOCK_ASSET_BASE = '/plugins/workflowsManagement/assets';

const getEmptyPromptLayoutStyles = (
  euiTheme: EuiThemeComputed,
  options: { flushFooterToCard: boolean }
) => css`
  && > .euiEmptyPrompt__main {
    inline-size: min(100%, ${PROMPT_MAX_WIDTH_PX}px);
    padding-inline: ${euiTheme.size.xl};
    padding-block-start: ${euiTheme.size.xl};
    padding-block-end: ${euiTheme.size.xl};
  }
  ${options.flushFooterToCard
    ? `
    && > .euiEmptyPrompt__footer {
      padding: 0;
      margin: 0;
      background: transparent;
      border: none;
    }
  `
    : ''}
`;

const getPrivilegeBadgeStyles = (euiTheme: EuiThemeComputed) => css`
  padding-block: 0;
  padding-inline: ${euiTheme.size.xs};
  min-block-size: 0;
  line-height: ${euiTheme.size.m};
`;

function getLockIllustrationSrc(http: HttpSetup | undefined, colorMode: string): string {
  const file = colorMode === 'LIGHT' ? 'lock_light.svg' : 'lock_dark.svg';
  return http?.basePath.prepend(`${LOCK_ASSET_BASE}/${file}`) ?? '';
}

interface PrivilegesFooterProps {
  requirements: readonly string[];
}

const PrivilegesFooter = ({ requirements }: PrivilegesFooterProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiHorizontalRule
        margin="none"
        css={{
          marginBlockStart: euiTheme.size.xs,
          marginBlockEnd: 0,
        }}
      />
      <EuiPanel
        data-test-subj="workflowsNoReadAccessRequiredPrivilegesSection"
        color="subdued"
        borderRadius="none"
        paddingSize="none"
        hasBorder={false}
        hasShadow={false}
        css={{
          textAlign: 'center',
          borderBottomLeftRadius: euiTheme.border.radius.medium,
          borderBottomRightRadius: euiTheme.border.radius.medium,
          paddingBlockStart: euiTheme.size.s,
          paddingInline: euiTheme.size.m,
          paddingBlockEnd: euiTheme.size.m,
        }}
      >
        <EuiText color="subdued" textAlign="center" size="xs">
          <p css={{ marginBlock: 0 }}>
            <FormattedMessage
              id="platform.plugins.shared.workflows_management.ui.noReadAccess.requiredPrivileges"
              defaultMessage="Minimum privileges required in this space:"
            />
          </p>
        </EuiText>
        <EuiFlexGroup
          gutterSize="xs"
          wrap
          justifyContent="center"
          responsive={false}
          css={{ marginBlockStart: euiTheme.size.xs }}
        >
          {requirements.map((requirement) => (
            <EuiFlexItem key={requirement} grow={false}>
              <EuiBadge color="hollow" css={getPrivilegeBadgeStyles(euiTheme)}>
                {requirement}
              </EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};

export interface AccessDeniedProps {
  /** Human-readable privilege labels (e.g. UI action names) needed to use the app in this space. */
  requirements?: readonly string[];
}

export const AccessDenied = ({ requirements }: AccessDeniedProps): JSX.Element => {
  useWorkflowsBreadcrumbs();
  const { euiTheme, colorMode } = useEuiTheme();
  const {
    services: { http },
  } = useKibana();

  const lockSrc = getLockIllustrationSrc(http, colorMode);
  const hasPrivilegesFooter = Boolean(requirements?.length);

  return (
    <EuiPageTemplate
      offset={0}
      paddingSize="none"
      grow
      css={{
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        minHeight: 'var(--kbn-application--content-height, 100vh)',
      }}
    >
      <EuiPageTemplate.Section
        grow
        css={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EuiEmptyPrompt
          data-test-subj="workflowsNoReadAccessEmptyState"
          hasShadow
          color="plain"
          paddingSize="none"
          css={getEmptyPromptLayoutStyles(euiTheme, { flushFooterToCard: hasPrivilegesFooter })}
          icon={
            <EuiImage
              size="s"
              src={lockSrc}
              alt={i18n.translate(
                'platform.plugins.shared.workflows_management.ui.noReadAccess.illustrationAlt',
                { defaultMessage: 'Restricted access' }
              )}
            />
          }
          title={
            <h2>
              <FormattedMessage
                id="platform.plugins.shared.workflows_management.ui.noReadAccess.title"
                defaultMessage="Contact your administrator for access"
              />
            </h2>
          }
          body={
            <p css={{ marginBlockEnd: 0, textAlign: 'center' }}>
              <FormattedMessage
                id="platform.plugins.shared.workflows_management.ui.noReadAccess.description"
                defaultMessage="To view workflows in this space, you need additional privileges."
              />
            </p>
          }
          footer={
            hasPrivilegesFooter && requirements ? (
              <PrivilegesFooter requirements={requirements} />
            ) : undefined
          }
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
