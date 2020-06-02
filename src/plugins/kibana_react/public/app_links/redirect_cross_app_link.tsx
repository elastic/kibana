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

import React, { FunctionComponent, useRef } from 'react';
import classNames from 'classnames';
import useObservable from 'react-use/lib/useObservable';
import { ApplicationStart } from 'src/core/public';
import { createCrossAppClickHandler } from './click_handler';

interface RedirectCrossAppLinksProps {
  application: ApplicationStart;
  className?: string;
  'data-test-subj'?: string;
}

/**
 * Utility component that will intercept click events on children anchor (`<a>`) elements to perform
 * SPA navigation if the link points to another application.
 *
 * @remarks
 * Links pointing to the current application will not be handled by the component, and should be handled
 * by the application's internal routing.
 *
 * @example
 * ```tsx
 * <RedirectCrossAppLinks application={application}>
 *   <a href="/base-path/app/another-app/some-path">Go to another-app</a>
 * </RedirectCrossAppLinks>
 * ```
 */
export const RedirectCrossAppLinks: FunctionComponent<RedirectCrossAppLinksProps> = ({
  application,
  children,
  className,
  ...otherProps
}) => {
  const currentAppId = useObservable(application.currentAppId$, undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const clickHandler =
    containerRef.current && currentAppId
      ? createCrossAppClickHandler({
          container: containerRef.current,
          currentAppId,
          navigateToApp: application.navigateToApp,
          parseAppUrl: application.parseAppUrl,
        })
      : undefined;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      ref={containerRef}
      className={classNames(className, 'kbnRedirectCrossAppLinks')}
      onClick={clickHandler}
      {...otherProps}
    >
      {children}
    </div>
  );
};
