/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/** @jsx jsx */

import { css, jsx } from '@emotion/react';

import {
  htmlIdGenerator,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiAccordion,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CustomIntegration } from '../../../common';
import { usePlatformService } from '../../services';

export interface Props {
  replacements: Array<Pick<CustomIntegration, 'id' | 'uiInternalPath' | 'title'>>;
}

// TODO - clintandrewhall: should use doc-links service
const URL_COMPARISON = 'https://ela.st/beats-agent-comparison';

const idGenerator = htmlIdGenerator('replacementCard');
const alsoAvailable = i18n.translate('customIntegrations.components.replacementAccordionLabel', {
  defaultMessage: 'Also available in Beats',
});

const link = (
  <EuiLink
    href={URL_COMPARISON}
    data-test-subj="customIntegrationsBeatsAgentComparisonLink"
    external
  >
    <FormattedMessage
      id="customIntegrations.components.replacementAccordion.comparisonPageLinkLabel"
      defaultMessage="comparison page"
    />
  </EuiLink>
);

/**
 * A pure component, an accordion panel which can display information about replacements for a given EPR module.
 */
export const ReplacementCard = ({ replacements }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { getAbsolutePath } = usePlatformService();

  if (replacements.length === 0) {
    return null;
  }

  const buttons = replacements.map((replacement, index) => (
    <EuiFlexItem grow={false} key={`button-${index}`}>
      <span>
        <EuiButton
          key={replacement.id}
          href={getAbsolutePath(replacement.uiInternalPath)}
          fullWidth={false}
          size="s"
        >
          {replacement.title}
        </EuiButton>
      </span>
    </EuiFlexItem>
  ));

  return (
    <div
      css={css`
        & .euiAccordion__button {
          color: ${euiTheme.colors.link};
        }
        & .euiAccordion-isOpen .euiAccordion__childWrapper {
          margin-top: ${euiTheme.size.m};
        }
      `}
    >
      <EuiAccordion id={idGenerator()} buttonContent={alsoAvailable} paddingSize="none">
        <EuiPanel color="subdued" hasShadow={false} paddingSize="m">
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem key="message">
              <EuiText size="s">
                <FormattedMessage
                  id="customIntegrations.components.replacementAccordion.recommendationDescription"
                  defaultMessage="Elastic Agent Integrations are recommended, but you can also use Beats. For more
      details, check out our {link}."
                  values={{
                    link,
                  }}
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem key="buttons">
              <EuiFlexGroup direction="column" gutterSize="m">
                {buttons}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiAccordion>
    </div>
  );
};
