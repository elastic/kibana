/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css, keyframes } from '@emotion/react';
import type { Observable } from 'rxjs';
import type { FC, MutableRefObject } from 'react';
import React, { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { EuiLoadingSpinner, EuiIcon, useEuiTheme } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { CoreTheme } from '@kbn/core-theme-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import { APP_WRAPPER_CLASS } from '@kbn/core-application-common';
import {
  AppStatus,
  type AppLeaveHandler,
  type AppUnmount,
  type ScopedHistory,
} from '@kbn/core-application-browser';
import { ThrowIfError } from '@kbn/shared-ux-error-boundary';
import type { Mounter } from '../types';
import { AppNotFound } from './app_not_found_screen';

interface Props {
  /** Path application is mounted on without the global basePath */
  appPath: string;
  appId: string;
  mounter?: Mounter;
  theme$: Observable<CoreTheme>;
  appStatus: AppStatus;
  setAppLeaveHandler: (appId: string, handler: AppLeaveHandler) => void;
  setAppActionMenu: (appId: string, mount: MountPoint | undefined) => void;
  createScopedHistory: (appUrl: string) => ScopedHistory;
  setIsMounting: (isMounting: boolean) => void;
  showPlainSpinner?: boolean;
}

export const AppContainer: FC<Props> = ({
  mounter,
  appId,
  appPath,
  setAppLeaveHandler,
  setAppActionMenu,
  createScopedHistory,
  appStatus,
  setIsMounting,
  theme$,
  showPlainSpinner,
}: Props) => {
  const [error, setError] = useState<Error | null>(null);
  const [showSpinner, setShowSpinner] = useState(true);
  const [appNotFound, setAppNotFound] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const unmountRef: MutableRefObject<AppUnmount | null> = useRef<AppUnmount>(null);

  useLayoutEffect(() => {
    const unmount = () => {
      if (unmountRef.current) {
        unmountRef.current();
        unmountRef.current = null;
      }
    };

    if (!mounter || appStatus !== AppStatus.accessible) {
      return setAppNotFound(true);
    }
    setAppNotFound(false);

    setIsMounting(true);
    if (mounter.unmountBeforeMounting) {
      unmount();
    }

    const mount = async () => {
      setShowSpinner(true);
      try {
        unmountRef.current =
          (await mounter.mount({
            appBasePath: mounter.appBasePath,
            history: createScopedHistory(appPath),
            element: elementRef.current!,
            theme$,
            onAppLeave: (handler) => setAppLeaveHandler(appId, handler),
            setHeaderActionMenu: (menuMount) => setAppActionMenu(appId, menuMount),
          })) || null;
      } catch (e) {
        setError(e);
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        if (elementRef.current) {
          setShowSpinner(false);
        }
        setIsMounting(false);
      }
    };

    mount();

    return unmount;
  }, [
    appId,
    appStatus,
    mounter,
    createScopedHistory,
    setAppLeaveHandler,
    setAppActionMenu,
    appPath,
    setIsMounting,
    theme$,
  ]);

  return (
    <Fragment>
      <ThrowIfError error={error} />
      {appNotFound && <AppNotFound />}
      {showSpinner && !appNotFound && (
        <AppLoadingPlaceholder showPlainSpinner={Boolean(showPlainSpinner)} />
      )}
      <div className={APP_WRAPPER_CLASS} key={appId} ref={elementRef} aria-busy={showSpinner} />
    </Fragment>
  );
};

const heartPulse = keyframes({
  '0%': { transform: 'scale3d(.2, .2, -.7)' },
  '40%': { transform: 'scale3d(1, 1, 2)' },
  '50%': { transform: 'scale3d(.99, .99, 2)' },
  '70%': { transform: 'scale3d(.96, .96, -2.5)' },
  '100%': { transform: 'scale3d(.98, .98, 2)' },
});

const heartLoadingStyles = css({
  '& .euiIcon path': {
    animationName: heartPulse,
    animationFillMode: 'forwards',
    animationDirection: 'alternate',
    transformStyle: 'preserve-3d',
    animationDuration: '1s',
    animationTimingFunction: 'cubic-bezier(0, 0.63, 0.49, 1)',
    animationIterationCount: 'infinite',
    transformOrigin: '50% 50%',
    '&:nth-of-type(1)': { animationDelay: '0s' },
    '&:nth-of-type(2)': { animationDelay: '0.035s' },
    '&:nth-of-type(3)': { animationDelay: '0.125s' },
    '&:nth-of-type(4)': { animationDelay: '0.155s' },
    '&:nth-of-type(5)': { animationDelay: '0.075s' },
    '&:nth-of-type(6)': { animationDelay: '0.06s' },
  },
});

const HeartIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} viewBox="0 0 32 32" {...props}>
    <path
      fill="#FEC514"
      stroke="#fff"
      strokeWidth="0.8"
      d="M16 7 C14.5 4.5 12 3 9.5 3 C5.5 3 2 6 2 10.5 C2 12.5 2.8 14.5 4.5 17 L16 7 Z"
    />
    <path
      fill="#02BCB7"
      stroke="#fff"
      strokeWidth="0.8"
      d="M4.5 17 C7 20.5 11 24.5 16 29 L16 7 L4.5 17 Z"
    />
    <path
      fill="#F04E98"
      stroke="#fff"
      strokeWidth="0.8"
      d="M16 7 C17.5 4.5 20 3 22.5 3 C26.5 3 30 6 30 10.5 C30 12.5 29.2 14.5 27.5 17 L16 7 Z"
    />
    <path
      fill="#0B64DD"
      stroke="#fff"
      strokeWidth="0.8"
      d="M27.5 17 C25 20.5 21 24.5 16 29 L16 7 L27.5 17 Z"
    />
    <path
      fill="#9ADC30"
      stroke="#fff"
      strokeWidth="0.8"
      d="M9.5 3 C5.5 3 2 6 2 10.5 C2 11 2.05 11.5 2.15 12 L16 7 C14.5 4.5 12 3 9.5 3 Z"
    />
    <path
      fill="#1BA9F5"
      stroke="#fff"
      strokeWidth="0.8"
      d="M22.5 3 C26.5 3 30 6 30 10.5 C30 11 29.95 11.5 29.85 12 L16 7 C17.5 4.5 20 3 22.5 3 Z"
    />
  </svg>
);

const AppLoadingPlaceholder: FC<{ showPlainSpinner: boolean }> = ({ showPlainSpinner }) => {
  const { euiTheme } = useEuiTheme();
  const appContainerFadeIn = keyframes({
    '0%': { opacity: 0 },
    '50%': { opacity: 0 },
    '100%': { opacity: 1 },
  });
  const appContainerStyles = css({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: euiTheme.levels.header,
    animationName: appContainerFadeIn,
    animationIterationCount: 1,
    animationTimingFunction: 'ease-in',
    animationDuration: '2s',
  });

  if (showPlainSpinner) {
    return (
      <EuiLoadingSpinner
        size={'xxl'}
        css={appContainerStyles}
        data-test-subj="appContainer-loadingSpinner"
        aria-label={i18n.translate('core.application.appContainer.plainSpinner.loadingAriaLabel', {
          defaultMessage: 'Loading application',
        })}
      />
    );
  }
  return (
    <EuiIcon
      type={HeartIcon}
      size="xxl"
      css={[appContainerStyles, heartLoadingStyles]}
      aria-label={i18n.translate('core.application.appContainer.loadingAriaLabel', {
        defaultMessage: 'Loading application',
      })}
    />
  );
};
