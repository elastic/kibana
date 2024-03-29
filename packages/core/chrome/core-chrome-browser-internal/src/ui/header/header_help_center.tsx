/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef, useState } from 'react';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { type ChromeHelpExtension, type ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import {
  EuiText,
  EuiTitle,
  EuiLink,
  EuiIcon,
  EuiPortal,
  EuiSplitPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderSectionItemButton,
  EuiButtonIcon,
} from '@elastic/eui';
import type { CSSObject } from '@emotion/serialize';

interface IHeaderHelpCenterTriggerProps {
  docLinks: DocLinksStart;
  breadCrumbs$: Rx.Observable<ChromeBreadcrumb[]>;
  helpExtension$: Rx.Observable<ChromeHelpExtension | undefined>;
  helpSupportUrl$: Rx.Observable<string>;
}

export const HeaderHelpCenterTrigger = (props: IHeaderHelpCenterTriggerProps) => {
  const [isPortalVisible, setIsPortalVisible] = useState(false);

  const togglePortal = () => {
    setIsPortalVisible(!isPortalVisible);
  };

  const closePortal = () => {
    setIsPortalVisible(false);
  };

  let portal;

  if (isPortalVisible) {
    portal = (
      <EuiPortal>
        <HeaderHelpCenter {...props} onClose={closePortal} />
      </EuiPortal>
    );
  }

  return (
    <div style={{ display: 'contents' }}>
      <EuiHeaderSectionItemButton
        aria-expanded={isPortalVisible}
        aria-haspopup="true"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.helpCenterButtonAriaLabel', {
          defaultMessage: 'Help Center',
        })}
        onClick={togglePortal}
      >
        <EuiIcon type={'questionInCircle'} size="l" />
      </EuiHeaderSectionItemButton>
      {portal}
    </div>
  );
};

type IHelpCenterPosition = Pick<CSSObject, 'top' | 'left'> | Pick<CSSObject, 'top' | 'right'>;

type IHeaderHelpCenter = IHeaderHelpCenterTriggerProps & {
  width?: CSSObject['width'];
  height?: CSSObject['height'];
  onClose: () => void;
  defaultPosition?: IHelpCenterPosition;
};

const HeaderHelpCenter = ({
  width = 654,
  height = 800,
  onClose,
  docLinks,
  helpSupportUrl$,
  breadCrumbs$,
  helpExtension$,
  defaultPosition = { top: 'var(--kbnHeaderOffset)', right: '0%' },
}: IHeaderHelpCenter) => {
  const positionPersistenceKey = useRef('help_center_position');
  const persistedPosition = JSON.parse(
    localStorage.getItem(positionPersistenceKey.current) || '{}'
  );
  const [helpCenterElm, setHelpCenterElm] = useState<HTMLElement | null>(null);
  const [helpCenterStyling, setHelpCenterStyling] = useState<CSSObject>({
    width,
    position: 'fixed',
    zIndex: 9999999, // TODO: confirm if there's a global zIndex
    ...(Object.keys(persistedPosition).length ? persistedPosition : defaultPosition),
  });

  const [helpConfig, setHelpConfig] = useState<{
    breadCrumbs?: ChromeBreadcrumb[];
    helpExtension?: ChromeHelpExtension;
    supportUrl: string;
  }>();

  useEffect(() => {
    const subscription = Rx.combineLatest([
      helpExtension$,
      helpSupportUrl$,
      breadCrumbs$,
    ]).subscribe(([helpExtension, supportUrl, breadCrumbs]) => {
      setHelpConfig({
        breadCrumbs,
        supportUrl,
        helpExtension,
      });
    });

    return () => subscription.unsubscribe();
  }, [breadCrumbs$, helpExtension$, helpSupportUrl$]);

  const dragEndPosition = useRef<Rx.Observable<{ position: IHelpCenterPosition }>>();

  useEffect(() => {
    if (helpCenterElm) {
      const mouseup = Rx.fromEvent<MouseEvent>(document, 'mouseup');
      const mousemove = Rx.fromEvent<MouseEvent>(document, 'mousemove');
      const mousedown = Rx.fromEvent<MouseEvent>(helpCenterElm, 'mousedown');

      dragEndPosition.current = mousedown.pipe(
        Rx.mergeMap(function (md) {
          // calculate offsets when mouse down
          const startX = md.offsetX;
          const startY = md.offsetY;
          const startOffsetWidth = (md.target as HTMLElement).offsetWidth;
          const startOffsetHeight = (md.target as HTMLElement).offsetHeight;

          // Calculate delta with mousemove until mouseup
          return mousemove
            .pipe(
              Rx.map(function (mm) {
                if (mm.preventDefault) mm.preventDefault();

                return {
                  position: {
                    left: Math.max(
                      0,
                      Math.min(mm.clientX - startX, window.innerWidth - startOffsetWidth)
                    ),
                    top: Math.max(
                      0,
                      Math.min(mm.clientY - startY, window.innerHeight - startOffsetHeight)
                    ),
                  },
                };
              }),
              Rx.map(function (data) {
                requestAnimationFrame(() => {
                  setHelpCenterStyling(({ right, ...prevElmStyling }) => ({
                    ...prevElmStyling,
                    top: data.position.top,
                    left: data.position.left,
                  }));
                });

                return data;
              })
            )
            .pipe(Rx.takeUntil(mouseup), Rx.last());
        })
      );
    }
  }, [helpCenterElm, helpCenterStyling.width]);

  useEffect(() => {
    if (helpCenterElm) {
      const dragEndSubscription = dragEndPosition.current?.subscribe(function onDragEndHandler({
        position,
      }) {
        localStorage.setItem(positionPersistenceKey.current, JSON.stringify(position));
      });

      return () => dragEndSubscription?.unsubscribe();
    }
  }, [helpCenterElm]);

  const { appName, links, content } = helpConfig?.helpExtension || {};

  return (
    <EuiFlexGroup ref={setHelpCenterElm} css={helpCenterStyling}>
      <EuiFlexItem>
        <EuiSplitPanel.Outer css={{ height }}>
          <EuiSplitPanel.Inner grow={false}>
            <EuiFlexGroup
              justifyContent="spaceBetween"
              alignItems="center"
              css={{ cursor: 'move' }}
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type="grabOmnidirectional" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h3>Help Center</h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon iconType="cross" onClick={onClose} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner color="subdued" css={{ minHeight: '200px' }}>
            <EuiText>
              <h4>{appName}</h4>
            </EuiText>
            <ul>
              {links?.map((link) => (
                <li>
                  <a href={link.href}>{link.linkType}</a>
                </li>
              ))}
            </ul>
            <EuiText>
              <p>{content}</p>
            </EuiText>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner grow={false} css={{ position: 'relative' }}>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiLink href={helpConfig?.supportUrl} target="_blank">
                  {i18n.translate(
                    'core.ui.chrome.headerGlobalNav.helpCenterFooterSupportLinkText',
                    {
                      defaultMessage: 'Support',
                    }
                  )}
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink href="http://www.elastic.co" target="_blank">
                  {i18n.translate(
                    'core.ui.chrome.headerGlobalNav.helpCenterFooterFeedbackLinkText',
                    {
                      defaultMessage: 'Give Feedback',
                    }
                  )}
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink href="http://www.elastic.co" target="_blank">
                  {i18n.translate('core.ui.chrome.headerGlobalNav.helpCenterFooterDocLinkText', {
                    defaultMessage: 'Browse all the docs',
                  })}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiIcon
              type="scale"
              size="xxl"
              css={{ position: 'absolute', right: 0, bottom: 0, cursor: 'nwse-resize' }}
            />
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
