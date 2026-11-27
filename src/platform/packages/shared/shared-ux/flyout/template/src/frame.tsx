/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { EuiFlyout, EuiLoadingSpinner, useGeneratedHtmlId } from '@elastic/eui';
import type {
  FlyoutTemplateFrameProps,
  FlyoutTemplateProps,
  FlyoutTemplateTabRootProps,
} from './types';
import { FlyoutTemplateConfigProvider, FlyoutTemplateManagedContextProvider } from './context';
import type { FlyoutTemplateManaged } from './context';
import { FlyoutTemplateFrameContext } from './context/frame_context';
import type { FlyoutTemplateFrameState } from './context/frame_context';
import { FlyoutTemplateDeclaration, omitTabRootProps, pickTabRootProps } from './declaration';
import { Header } from './header/header';
import { Body } from './body/body';

/**
 * Shown while the frame's content suspends: the frame's own title, marked as loading. The title
 * comes from the frame's props because the content's header does not exist yet.
 */
const FrameLoadingDeclaration = ({
  frame,
  title,
}: {
  frame: FlyoutTemplateFrameState;
  title: string | undefined;
}) => (
  <FlyoutTemplateDeclaration
    frame={frame}
    props={{
      // The frame's tabs would put this declaration in tabbed mode, which ignores the spinner
      // because it isn't inside a Body.TabPanel.
      tabs: [],
      children: title ? (
        <>
          <Header title={title} isLoading />
          <Body />
        </>
      ) : (
        <Body>
          <EuiLoadingSpinner size="l" />
        </Body>
      ),
    }}
  />
);

interface FlyoutTemplateFrameViewProps {
  frameProps: Partial<FlyoutTemplateProps>;
  onClose: FlyoutTemplateProps['onClose'] | undefined;
  isManaged: boolean;
  /** Tab props from the frame's options, used where a declaration does not set its own. */
  tabProps: FlyoutTemplateTabRootProps;
  children?: ReactNode;
}

const NO_TAB_PROPS: FlyoutTemplateTabRootProps = {};

/**
 * Owns the `EuiFlyout` and stays mounted while the `FlyoutTemplate` declarations inside it come
 * and go.
 */
const FlyoutTemplateFrameView = ({
  frameProps,
  onClose,
  isManaged,
  tabProps,
  children,
}: FlyoutTemplateFrameViewProps) => {
  const {
    size = 'm',
    session = 'start',
    flyoutMenuProps,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'data-test-subj': dataTestSubj,
    ...euiFlyoutProps
  } = omitTabRootProps(frameProps);

  const htmlIdSuffix = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const flyoutTitleId = useGeneratedHtmlId({ prefix: `flyoutTemplateTitle${htmlIdSuffix}` });
  const [hasHeader, setHasHeader] = useState(false);
  const declarationOnCloseRef = useRef<FlyoutTemplateProps['onClose']>();

  // EUI routes the close button, history navigation, and cascade closes through `onClose`, and
  // has already dropped the flyout from its manager by the time any of them arrive. Content
  // that wraps or swallows the handler must not be able to strand a managed flyout, so its
  // teardown runs regardless of what the declaration's handler does.
  const hasClosedRef = useRef(false);
  const handleClose = useCallback<NonNullable<FlyoutTemplateProps['onClose']>>(
    (event) => {
      if (!isManaged) {
        onClose?.(event);
        return;
      }
      // EUI's history-navigation detector invokes `onClose` before clearing the flag its own
      // unmount cleanup reads, so the synchronous teardown below re-enters this handler.
      if (hasClosedRef.current) {
        return;
      }
      hasClosedRef.current = true;
      try {
        declarationOnCloseRef.current?.(event);
      } finally {
        onClose?.(event);
      }
    },
    [isManaged, onClose]
  );

  const frameState = useMemo<FlyoutTemplateFrameState>(
    () => ({
      flyoutTitleId,
      isManaged,
      setHasHeader,
      declarationOnCloseRef,
      tabProps,
    }),
    [flyoutTitleId, isManaged, tabProps]
  );
  const config = useMemo(() => ({ dataTestSubj }), [dataTestSubj]);

  // EUI re-registers a managed flyout, closing its history group, when its title changes, so the
  // menu title comes only from the frame's own props, never from a declaration's header.
  const menuTitle = flyoutMenuProps?.title;
  const loadingTitle = typeof menuTitle === 'string' ? menuTitle : ariaLabel;
  const isMissingMenuTitle = isManaged && session !== 'never' && !loadingTitle;
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && isMissingMenuTitle) {
      // eslint-disable-next-line no-console
      console.warn(
        '[FlyoutTemplate] A managed flyout needs a menu title. Pass `flyoutMenuProps.title` in the options of `openFlyoutTemplate`; the header title of the content is not used.'
      );
    }
  }, [isMissingMenuTitle]);
  const flyoutAriaLabelledBy =
    ariaLabelledBy ?? (!ariaLabel && hasHeader ? flyoutTitleId : undefined);
  const flyoutAriaLabel = flyoutAriaLabelledBy
    ? undefined
    : ariaLabel ?? (typeof menuTitle === 'string' ? menuTitle : undefined);

  return (
    <EuiFlyout
      {...euiFlyoutProps}
      onClose={handleClose}
      size={size}
      session={session}
      paddingSize="m"
      data-test-subj={dataTestSubj}
      flyoutMenuDisplayMode="auto"
      flyoutMenuProps={flyoutMenuProps}
      aria-label={flyoutAriaLabel}
      aria-labelledby={flyoutAriaLabelledBy}
    >
      <FlyoutTemplateConfigProvider value={config}>
        <FlyoutTemplateFrameContext.Provider value={frameState}>
          <Suspense fallback={<FrameLoadingDeclaration frame={frameState} title={loadingTitle} />}>
            {children}
          </Suspense>
        </FlyoutTemplateFrameContext.Provider>
      </FlyoutTemplateConfigProvider>
    </EuiFlyout>
  );
};

/**
 * A flyout that stays mounted while its content changes. Pass it the root props that configure
 * the flyout, and render `FlyoutTemplate` declarations inside it, behind components that load
 * lazily or suspend if needed. While the content suspends, the frame shows its title from
 * `flyoutMenuProps.title` or `aria-label`, marked as loading.
 */
export const FlyoutTemplateFrame = ({
  children,
  onClose,
  ...frameProps
}: FlyoutTemplateFrameProps) => (
  <FlyoutTemplateFrameView
    frameProps={frameProps}
    onClose={onClose}
    isManaged={false}
    tabProps={NO_TAB_PROPS}
  >
    {children}
  </FlyoutTemplateFrameView>
);

/**
 * @internal Wraps managed flyout content. Not for use by flyout authors.
 *
 * Renders the frame from the opener's resolved props, so the content component renders only
 * declarations. `onClose` stays the declaration's own, so the declarative contract can keep
 * requiring it, with the opener's teardown composed in behind it.
 */
export const FlyoutTemplateManagedProvider = ({
  value,
  children,
}: {
  value: FlyoutTemplateManaged;
  children: ReactNode;
}) => {
  const tabProps = useMemo(() => pickTabRootProps(value.props), [value.props]);
  return (
    <FlyoutTemplateManagedContextProvider value={value}>
      <FlyoutTemplateFrameView
        frameProps={value.props}
        onClose={value.close}
        isManaged
        tabProps={tabProps}
      >
        {children}
      </FlyoutTemplateFrameView>
    </FlyoutTemplateManagedContextProvider>
  );
};
