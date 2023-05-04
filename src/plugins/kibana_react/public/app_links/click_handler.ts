/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ApplicationStart } from '@kbn/core/public';
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
