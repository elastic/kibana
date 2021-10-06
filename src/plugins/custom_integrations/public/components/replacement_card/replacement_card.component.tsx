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
import { FormattedMessage } from '@kbn/i18n/react';

import { FC } from 'react';
import { CustomIntegration, Shipper, SHIPPER_DISPLAY } from '../../../common';
import { usePlatformService } from '../../services';

export interface Props {
  replacements: Array<Pick<CustomIntegration, 'id' | 'uiInternalPath' | 'title'>>;
  shipper: Shipper;
}

// TODO - clintandrewhall: should use doc-links service
const URL_COMPARISON = 'https://ela.st/beats-agent-comparison';

const idGenerator = htmlIdGenerator('replacementCard');

const getAlsoAvailable = (shipper: Shipper) =>
  i18n.translate('customIntegrations.components.replacementAccordionLabel', {
    defaultMessage: 'Also available in {shipper}',
    values: {
      shipper: SHIPPER_DISPLAY[shipper],
    },
  });

const messages: { [key in Shipper]: FC } = {
  beats: () => {
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

    return (
      <FormattedMessage
        id="customIntegrations.components.replacementAccordion.beatsDescription"
        defaultMessage="Elastic Agent Integrations are recommended, but you can also use {beats}. For more
      details, check out our {link}."
        values={{
          beats: SHIPPER_DISPLAY.beats,
          link,
        }}
      />
    );
  },
  sample_data: () => (
    <FormattedMessage
      id="customIntegrations.components.replacementAccordion.sampleDataDescription"
      defaultMessage="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
    />
  ),
  tutorial: () => (
    <FormattedMessage
      id="customIntegrations.components.replacementAccordion.sampleDataDescription"
      defaultMessage="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
    />
  ),
};

/**
 * A pure component, an accordion panel which can display information about replacements for a given EPR module.
 */
export const ReplacementCard = ({ replacements, shipper }: Props) => {
  const { euiTheme } = useEuiTheme();
  const { getAbsolutePath } = usePlatformService();

  if (replacements.length === 0) {
    return null;
  }

  const buttons = replacements.map((replacement) => (
    <EuiFlexItem grow={false}>
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

  const Message = messages[shipper];

  return (
    <div
      css={css`
        & + & {
          margin-top: ${euiTheme.size.s};
        }
        & .euiAccordion__button {
          color: ${euiTheme.colors.link};
        }
        & .euiAccordion-isOpen .euiAccordion__childWrapper {
          margin-top: ${euiTheme.size.m};
        }
      `}
    >
      <EuiAccordion id={idGenerator()} buttonContent={getAlsoAvailable(shipper)} paddingSize="none">
        <EuiPanel color="subdued" hasShadow={false} paddingSize="m">
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiText size="s">
                <Message />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
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
