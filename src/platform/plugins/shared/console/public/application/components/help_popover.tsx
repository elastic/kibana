/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiTitle, EuiText, EuiPanel, EuiSpacer, EuiListGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import { useServicesContext } from '../contexts';

interface HelpPopoverProps {
  button: any;
  isOpen: boolean;
  closePopover: () => void;
  resetTour: () => void;
}

const styles = {
  // Hide the external svg icon for the link given that we have a custom icon for it.
  // Also remove the the hover effect on the action icon since it's a bit distracting.
  listItem: css`
    .euiListGroupItem__button {
      > svg {
        display: none;
      }
    }

    .euiButtonIcon:hover {
      background: transparent;
    }
  `,
};

export const HelpPopover = ({ button, isOpen, closePopover, resetTour }: HelpPopoverProps) => {
  const { docLinks } = useServicesContext();

  const listItems = useMemo(
    () => [
      {
        label: i18n.translate('console.helpPopover.aboutConsoleLabel', {
          defaultMessage: 'About Console',
        }),
        href: docLinks.console.guide,
        target: '_blank',
        css: styles.listItem,
        extraAction: {
          iconType: 'popout',
          href: docLinks.console.guide,
          target: '_blank',
          alwaysShow: true,
          'aria-label': i18n.translate('console.helpPopover.aboutConsoleButtonAriaLabel', {
            defaultMessage: 'About Console link',
          }),
        },
      },
      {
        label: i18n.translate('console.helpPopover.aboutQueryDSLLabel', {
          defaultMessage: 'About Query DSL',
        }),
        href: docLinks.query.queryDsl,
        target: '_blank',
        css: styles.listItem,
        extraAction: {
          iconType: 'popout',
          href: docLinks.query.queryDsl,
          target: '_blank',
          alwaysShow: true,
          'aria-label': i18n.translate('console.helpPopover.aboutQueryDSLButtonAriaLabel', {
            defaultMessage: 'About QueryDSL link',
          }),
        },
      },
      {
        label: i18n.translate('console.helpPopover.rerunTourLabel', {
          defaultMessage: 'Re-run feature tour',
        }),
        css: styles.listItem,
        onClick: resetTour,
        extraAction: {
          iconType: 'refresh',
          alwaysShow: true,
          onClick: resetTour,
          'data-test-subj': 'consoleRerunTourButton',
          'aria-label': i18n.translate('console.helpPopover.rerunTourButtonAriaLabel', {
            defaultMessage: 'Re-run feature tour button',
          }),
        },
      },
    ],
    [docLinks, resetTour]
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downRight"
      buffer={4}
      ownFocus={false}
      panelPaddingSize="none"
      data-test-subj="consoleHelpPopover"
    >
      <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
        <EuiTitle size="xs">
          <h4>
            {i18n.translate('console.helpPopover.title', {
              defaultMessage: 'Elastic Console',
            })}
          </h4>
        </EuiTitle>

        <EuiSpacer size="s" />

        <EuiText css={{ width: 300 }} color="subdued" size="s">
          <p>
            {i18n.translate('console.helpPopover.description', {
              defaultMessage:
                'Console is an interactive UI for calling Elasticsearch and Kibana APIs and viewing their responses. Search your data, manage settings, and more, using Query DSL and REST API syntax.',
            })}
          </p>
        </EuiText>
      </EuiPanel>

      <EuiListGroup listItems={listItems} color="primary" size="s" />
    </EuiPopover>
  );
};
