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

import React, { useEffect, createRef, useRef, RefObject } from 'react';

import { ChromeBreadcrumb, AppMountParameters } from 'kibana/public';
import { ManagementApp } from '../../utils';
import { Unmount } from '../../types';

interface ManagementSectionWrapperProps {
  app: ManagementApp;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  onAppMounted: (id: string) => void;
  history: AppMountParameters['history'];
}

export const ManagementAppWrapper = ({
  app,
  setBreadcrumbs,
  onAppMounted,
  history,
}: ManagementSectionWrapperProps) => {
  const mountElementRef = useRef<RefObject<any>>();
  const { mount, basePath } = app;
  const unmount = useRef<Unmount>();

  mountElementRef.current = createRef<HTMLElement>();

  useEffect(() => {
    if (mount && basePath) {
      const mountResult = mount({
        basePath,
        setBreadcrumbs,
        element: mountElementRef.current!.current,
        history,
      });

      onAppMounted(app.id);

      if (mountResult instanceof Promise) {
        mountResult.then(um => {
          unmount.current = um;
        });
      } else {
        unmount.current = mountResult;
      }
      return () => {
        if (unmount.current) {
          unmount.current();
        }
      };
    }
  }, [app.id, basePath, history, mount, onAppMounted, setBreadcrumbs]);

  return <main ref={mountElementRef.current} />;
};
