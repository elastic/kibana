/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiButtonEmptyProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { useIsServerless, useKibanaVersion } from '@kbn/react-env';
import { css } from '@emotion/react';
import { isModifiedOrPrevented } from './nav_link';
import { useNavigateToUrl } from './chrome_hooks';
import { useHelpLinks } from './help_links_hooks';

const createCustomLink = (
  index: number,
  text: React.ReactNode,
  addSpacer?: boolean,
  buttonProps?: EuiButtonEmptyProps
) => (
  <Fragment key={`helpButton${index}`}>
    <EuiButtonEmpty {...buttonProps} size="s" flush="left">
      {text}
    </EuiButtonEmpty>
    {addSpacer && <EuiSpacer size="xs" />}
  </Fragment>
);

interface HeaderHelpMenuProps {
  renderButton?: (props: { isOpen: boolean; toggleMenu: () => void }) => React.ReactNode;
}

export const HeaderHelpMenu = ({ renderButton }: HeaderHelpMenuProps = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

  const navigateToUrl = useNavigateToUrl();
  const { euiTheme } = useEuiTheme();
  const isServerless = useIsServerless();
  const kibanaVersion = useKibanaVersion();

  const {
    global: globalHelpLinks,
    default: defaultContentLinks,
    extension: helpExtensionLinks,
  } = useHelpLinks();
  const extensionLinks = helpExtensionLinks?.items ?? [];

  const createOnClickHandler = useCallback(
    (href: string) => (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      if (!isModifiedOrPrevented(event) && event.button === 0) {
        event.preventDefault();
        closeMenu();
        navigateToUrl(href);
      }
    },
    [closeMenu, navigateToUrl]
  );

  const euiThemePadding = css`
    padding: ${euiTheme.size.s};
  `;

  const defaultContent = (
    <Fragment>
      {defaultContentLinks.map(
        ({ href, label, onClick: _onClick, 'data-test-subj': dataTestSubj, target }, idx) => {
          if (href && _onClick) {
            throw new Error(
              'Only one of `href` and `onClick` should be provided for the help menu link.'
            );
          }

          const hrefProps = href ? { href, target } : {};
          const onClick = () => {
            if (!_onClick) return;
            _onClick();
            closeMenu();
          };

          const isLast = idx === defaultContentLinks.length - 1;
          return (
            <Fragment key={`defaultHelpLink${idx}`}>
              <EuiButtonEmpty
                {...hrefProps}
                onClick={onClick}
                size="s"
                flush="left"
                data-test-subj={dataTestSubj}
              >
                {label}
              </EuiButtonEmpty>
              {!isLast && <EuiSpacer size="xs" />}
            </Fragment>
          );
        }
      )}
    </Fragment>
  );

  const globalCustomContent = globalHelpLinks.map((link, index) =>
    createCustomLink(index, link.label, true, {
      href: link.href,
      onClick:
        link.onClick ??
        (link.href && !link.isExternal ? createOnClickHandler(link.href) : undefined),
      rel: link.rel,
      target: link.target,
      'data-test-subj': link['data-test-subj'],
    })
  );

  let customContent: React.ReactNode = null;
  if (helpExtensionLinks) {
    const customLinks = extensionLinks.map((link, index) =>
      createCustomLink(index, link.label, index < extensionLinks.length - 1, {
        href: link.href,
        onClick:
          link.onClick ??
          (link.href && !link.isExternal ? createOnClickHandler(link.href) : undefined),
        rel: link.rel,
        target: link.target,
        'data-test-subj': link['data-test-subj'],
      })
    );

    const extensionContent =
      helpExtensionLinks.renderContent?.({ hideHelpMenu: closeMenu }) ?? null;

    customContent = (
      <>
        <EuiPopoverTitle>
          <h3>{helpExtensionLinks.label}</h3>
        </EuiPopoverTitle>
        {customLinks}
        {extensionContent && (
          <>
            {extensionLinks.length > 0 && <EuiSpacer size="xs" />}
            {extensionContent}
          </>
        )}
      </>
    );
  }

  const button = renderButton ? (
    renderButton({ isOpen, toggleMenu })
  ) : (
    <EuiHeaderSectionItemButton
      aria-expanded={isOpen}
      aria-haspopup="true"
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuButtonAriaLabel', {
        defaultMessage: 'Help menu',
      })}
      onClick={toggleMenu}
    >
      <EuiIcon type="question" size="m" aria-hidden={true} />
    </EuiHeaderSectionItemButton>
  );

  return (
    <EuiPopover
      aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuPopoverAriaLabel', {
        defaultMessage: 'Help menu',
      })}
      anchorPosition="downRight"
      button={button}
      closePopover={closeMenu}
      data-test-subj="helpMenuButton"
      id="headerHelpMenu"
      isOpen={isOpen}
      repositionOnScroll
    >
      <EuiPopoverTitle>
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem>
            <h2>
              <FormattedMessage
                id="core.ui.chrome.headerGlobalNav.helpMenuTitle"
                defaultMessage="Help"
              />
            </h2>
          </EuiFlexItem>
          {!isServerless && (
            <EuiFlexItem
              grow={false}
              css={{ textTransform: 'none' }}
              data-test-subj="kbnVersionString"
            >
              <FormattedMessage
                id="core.ui.chrome.headerGlobalNav.helpMenuVersion"
                defaultMessage="v {version}"
                values={{ version: kibanaVersion }}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPopoverTitle>

      <div style={{ maxWidth: 240 }}>
        {globalCustomContent}
        {defaultContent}
        {customContent && (
          <>
            <EuiPopoverFooter css={euiThemePadding} />
            {customContent}
          </>
        )}
      </div>
    </EuiPopover>
  );
};
