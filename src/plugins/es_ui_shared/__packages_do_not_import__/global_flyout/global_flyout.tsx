/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
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

export const GlobalFlyoutProvider: React.FC = ({ children }) => {
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
