/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  FC,
  PropsWithChildren,
} from 'react';
import { EuiFlyout } from '@elastic/eui';

interface Context {
  addContent: <P extends object = { [key: string]: any }>(content: Content<P>) => void;
  removeContent: (contentId: string) => void;
  closeFlyout: () => void;
}

interface Content<P extends object = { [key: string]: any }> {
  id: string;
  Component: React.FunctionComponent<P>;
  props?: P;
  flyoutProps?: { [key: string]: any };
  cleanUpFunc?: () => void;
}

const FlyoutMultiContentContext = createContext<Context | undefined>(undefined);

const DEFAULT_FLYOUT_PROPS = {
  'data-test-subj': 'flyout',
  size: 'm' as 'm',
  maxWidth: 500,
};

export const GlobalFlyoutProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const [showFlyout, setShowFlyout] = useState(false);
  const [activeContent, setActiveContent] = useState<Content<any> | undefined>(undefined);

  const { id, Component, props, flyoutProps, cleanUpFunc } = activeContent ?? {};

  const addContent: Context['addContent'] = useCallback((content) => {
    setActiveContent((prev) => {
      if (prev !== undefined) {
        if (prev.id !== content.id && prev.cleanUpFunc) {
          // Clean up anything from the content about to be removed
          prev.cleanUpFunc();
        }
      }
      return content;
    });

    setShowFlyout(true);
  }, []);

  const closeFlyout: Context['closeFlyout'] = useCallback(() => {
    setActiveContent(undefined);
    setShowFlyout(false);
  }, []);

  const removeContent: Context['removeContent'] = useCallback(
    (contentId: string) => {
      // Note: when we will actually deal with multi content then
      // there will be more logic here! :)
      if (contentId === id) {
        setActiveContent(undefined);

        if (cleanUpFunc) {
          cleanUpFunc();
        }

        closeFlyout();
      }
    },
    [id, closeFlyout, cleanUpFunc]
  );

  const mergedFlyoutProps = useMemo(() => {
    return {
      ...DEFAULT_FLYOUT_PROPS,
      onClose: closeFlyout,
      ...flyoutProps,
    };
  }, [flyoutProps, closeFlyout]);

  const context: Context = {
    addContent,
    removeContent,
    closeFlyout,
  };

  const ContentFlyout = showFlyout && Component !== undefined ? Component : null;

  return (
    <FlyoutMultiContentContext.Provider value={context}>
      <>
        {children}
        {ContentFlyout && (
          <EuiFlyout {...mergedFlyoutProps}>
            <ContentFlyout {...props} />
          </EuiFlyout>
        )}
      </>
    </FlyoutMultiContentContext.Provider>
  );
};

export const useGlobalFlyout = () => {
  const ctx = useContext(FlyoutMultiContentContext);

  if (ctx === undefined) {
    throw new Error('useGlobalFlyout must be used within a <GlobalFlyoutProvider />');
  }

  const isMounted = useRef(false);
  /**
   * A component can add one or multiple content to the flyout
   * during its lifecycle. When it unmounts, we will remove
   * all those content added to the flyout.
   */
  const contents = useRef<Set<string> | undefined>(undefined);
  const { removeContent, addContent: addContentToContext } = ctx;

  const getContents = useCallback(() => {
    if (contents.current === undefined) {
      contents.current = new Set();
    }
    return contents.current;
  }, []);

  const addContent: Context['addContent'] = useCallback(
    (content) => {
      getContents().add(content.id);
      return addContentToContext(content);
    },
    [getContents, addContentToContext]
  );

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (!isMounted.current) {
        // When the component unmounts, remove all the content it has added to the flyout
        Array.from(getContents()).forEach(removeContent);
      }
    };
  }, [removeContent, getContents]);

  return { ...ctx, addContent };
};
