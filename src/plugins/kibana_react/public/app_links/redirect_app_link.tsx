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

import React, { FunctionComponent, useRef, useMemo } from 'react';
import classNames from 'classnames';
import useObservable from 'react-use/lib/useObservable';
import { ApplicationStart } from 'src/core/public';
import { createNavigateToUrlClickHandler } from './click_handler';

interface RedirectCrossAppLinksProps {
  application: ApplicationStart;
  className?: string;
  'data-test-subj'?: string;
}

/**
 * Utility component that will intercept click events on children anchor (`<a>`) elements to call
 * `application.navigateToUrl` with the link's href. This will trigger SPA friendly navigation
 * when the link points to a valid Kibana app.
 *
 * @example
 * ```tsx
 * <RedirectCrossAppLinks application={application}>
 *   <a href="/base-path/app/another-app/some-path">Go to another-app</a>
 * </RedirectCrossAppLinks>
 * ```
 *
 * @remarks
 * It is recommended to use the component at the highest possible level of the component tree that would
 * require to handle the links. A good practice is to consider it as a context provider and to use it
 * at the root level of an application or of the page that require the feature.
 */
export const RedirectAppLinks: FunctionComponent<RedirectCrossAppLinksProps> = ({
  application,
  children,
  className,
  ...otherProps
}) => {
  const currentAppId = useObservable(application.currentAppId$, undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const clickHandler = useMemo(
    () =>
      containerRef.current && currentAppId
        ? createNavigateToUrlClickHandler({
            container: containerRef.current,
            navigateToUrl: application.navigateToUrl,
          })
        : undefined,
    [containerRef.current, application, currentAppId]
  );

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
