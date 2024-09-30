/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiTitle,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiSpacer,
} from '@elastic/eui';
import { useServicesContext } from '../contexts';

interface HelpPopoverProps {
  button: any;
  isOpen: boolean;
  closePopover: () => void;
  resetTour: () => void;
}

export const HelpPopover = ({ button, isOpen, closePopover, resetTour }: HelpPopoverProps) => {
  const { docLinks } = useServicesContext();

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downRight"
      buffer={4}
      ownFocus={false}
      data-test-subj="consoleHelpPopover"
    >
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('console.helpPopover.title', {
            defaultMessage: 'Elastic Console',
          })}
        </h4>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiText style={{ width: 300 }} color="subdued" size="s">
        <p>
          {i18n.translate('console.helpPopover.description', {
            defaultMessage:
              'Console is an interactive UI for calling Elasticsearch and Kibana APIs and viewing their responses. Search your data, manage settings, and more, using Query DSL and REST API syntax.',
          })}
        </p>
      </EuiText>

      <EuiSpacer />

      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <p>
                {i18n.translate('console.helpPopover.aboutConsoleLabel', {
                  defaultMessage: 'About Console',
                })}
              </p>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="popout"
                href={docLinks.console.guide}
                target="_blank"
                color="text"
                aria-label={i18n.translate('console.helpPopover.aboutConsoleButtonAriaLabel', {
                  defaultMessage: 'About Console link',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <p>
                {i18n.translate('console.helpPopover.aboutQueryDSLLabel', {
                  defaultMessage: 'About Query DSL',
                })}
              </p>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="popout"
                href={docLinks.query.queryDsl}
                target="_blank"
                color="text"
                aria-label={i18n.translate('console.helpPopover.aboutQueryDSLButtonAriaLabel', {
                  defaultMessage: 'About QueryDSL link',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <p>
                {i18n.translate('console.helpPopover.rerunTourLabel', {
                  defaultMessage: 'Re-run feature tour',
                })}
              </p>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="refresh"
                onClick={resetTour}
                color="text"
                aria-label={i18n.translate('console.helpPopover.rerunTourButtonAriaLabel', {
                  defaultMessage: 'Re-run feature tour button',
                })}
                data-test-subj="consoleRerunTourButton"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
