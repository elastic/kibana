/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface RouterLinkProps {
  href: string | undefined;
  onClick: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement, MouseEvent>) => void;
}

interface GetRouterLinkPropsDeps {
  href?: string;
  onClick(): void;
}

const isModifiedEvent = (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent = (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) =>
  event.button === 0;

/**
 *
 * getRouterLinkProps is an util that enable HTML elements, such buttons, to
 * behave as links.
 * @example
 * const linkProps = getRouterLinkProps({ href: 'https://my-link', onClick: () => {console.log('click event')} });
 * <EuiButton {...linkProps}>My custom link</EuiButton>
 * @param href target url
 * @param onClick onClick callback
 * @returns An object that contains an href and a guardedClick handler that will
 * manage behaviours such as leftClickEvent and event with modifiers (Ctrl, Shift, etc)
 */
export const getRouterLinkProps = ({ href, onClick }: GetRouterLinkPropsDeps): RouterLinkProps => {
  const guardedClickHandler = (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (event.defaultPrevented) {
      return;
    }

    if (isModifiedEvent(event) || !isLeftClickEvent(event)) {
      return;
    }

    // Prevent regular link behavior, which causes a browser refresh.
    event.preventDefault();

    onClick();
  };

  return { href, onClick: guardedClickHandler };
};
