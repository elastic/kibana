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

import React from 'react';
import { ApplicationStart } from 'src/core/public';
import { getClosestLink, hasActiveModifierKey } from './utils';

interface CreateCrossAppClickHandlerOptions {
  container: HTMLElement;
  navigateToUrl: ApplicationStart['navigateToUrl'];
}

export const createNavigateToUrlClickHandler = ({
  container,
  navigateToUrl,
}: CreateCrossAppClickHandlerOptions): React.MouseEventHandler<HTMLElement> => {
  return (e) => {
    if (container == null) {
      return;
    }
    // see https://github.com/DefinitelyTyped/DefinitelyTyped/pull/12239
    const target = e.target as HTMLElement;

    const link = getClosestLink(target, container);
    if (!link) {
      return;
    }

    if (
      link.href && // ignore links with empty hrefs
      (link.target === '' || link.target === '_self') && // ignore links having a target
      e.button === 0 && // ignore everything but left clicks
      !e.defaultPrevented && // ignore default prevented events
      !hasActiveModifierKey(e) // ignore clicks with modifier keys
    ) {
      e.preventDefault();
      navigateToUrl(link.href);
    }
  };
};
