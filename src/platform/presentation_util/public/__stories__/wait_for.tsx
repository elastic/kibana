/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useRef, ReactElement } from 'react';
import { act } from 'react-test-renderer';
import { Story } from '@storybook/react';
import { EuiLoadingSpinner } from '@elastic/eui';

export const waitFor =
  (waitTarget: Promise<any>, spinner: ReactElement | null = <EuiLoadingSpinner />) =>
  (CurrentStory: Story) => {
    const [storyComponent, setStory] = useState<ReactElement>();
    const componentIsMounted = useRef(false);

    useEffect(() => {
      componentIsMounted.current = true;
      return () => {
        componentIsMounted.current = false;
      };
    }, []);

    useEffect(() => {
      if (!storyComponent) {
        waitTarget.then((waitedTarget: any) => {
          if (!componentIsMounted.current) return;
          act(() => {
            setStory(<CurrentStory {...waitedTarget} />);
          });
        });
      }
    }, [CurrentStory, storyComponent]);

    return storyComponent ?? spinner;
  };
