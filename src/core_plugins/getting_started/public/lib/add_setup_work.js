import { get } from 'lodash';
import uiRoutes, { WAIT_FOR_URL_CHANGE_TOKEN } from 'ui/routes';
import uiChrome from 'ui/chrome';
import { Notifier } from 'ui/notify/notifier';
import { IndexPatternsGetIdsProvider } from 'ui/index_patterns/_get_ids';
import KbnUrlProvider from 'ui/url';
import { hasOptedOutOfGettingStarted, optOutOfGettingStarted } from 'ui/getting_started/opt_out_helpers';

import {
  GETTING_STARTED_ROUTE,
  CREATE_INDEX_PATTERN_ROUTE
} from './constants';

function handleExistingIndexPatternsScenario(indexPatterns, currentRoute, config) {
  // If index patterns exist, we're not going to show the user the Getting Started page.
  // So we can show the chrome again at this point.
  uiChrome.setVisible(true);

  // The user need not see the Getting Started page, so opt them out of it
  optOutOfGettingStarted();

  // Some routes require a default index pattern to be present. If we're
  // NOT on such a route, there's nothing more to do; send the user on their way
  if (!currentRoute.requireDefaultIndex) {
    return;
  }

  // Otherwise, check if we have a default index pattern
  let defaultIndexPattern = config.get('defaultIndex');

  // If we don't have an default index pattern, make the first index pattern the
  // default one
  if (!Boolean(defaultIndexPattern)) {
    defaultIndexPattern = indexPatterns[0];
    config.set('defaultIndex', defaultIndexPattern);
  }

  // At this point, we have a default index pattern and are all set!
  return;
}

function handleGettingStartedOptedOutScenario(currentRoute, kbnUrl) {
  // If the user has opted out of the Getting Started page, we're not going to show them that page.
  // So we can show the chrome again at this point.
  uiChrome.setVisible(true);

  // Some routes require a default index pattern to be present. If we're
  // NOT on such a route, there's nothing more to do; send the user on their way
  if (!currentRoute.requireDefaultIndex) {
    return;
  }

  // Otherwise, redirect the user to the index pattern creation page with
  // a notification about creating an index pattern
  const notify = new Notifier({
    location: 'Index Patterns'
  });
  notify.error('Please create a new index pattern');

  kbnUrl.change(CREATE_INDEX_PATTERN_ROUTE);
  throw WAIT_FOR_URL_CHANGE_TOKEN;
}

function showGettingStartedPage(kbnUrl, isOnGettingStartedPage) {
  // Redirect the user to the Getting Started page (unless they are on it already)
  if (!isOnGettingStartedPage) {
    kbnUrl.change(GETTING_STARTED_ROUTE);
    throw WAIT_FOR_URL_CHANGE_TOKEN;
  }
}

/*
 * This function is exported for unit testing
 */
export function gettingStartedGateCheck(getIds, kbnUrl, config, $route) {
  const currentRoute = get($route, 'current.$$route');
  const isOnGettingStartedPage = get(currentRoute, 'originalPath') === GETTING_STARTED_ROUTE;
  const isOnEmbeddedPage = Boolean(get($route, 'current.params.embed', false));

  if (isOnEmbeddedPage) {
    return Promise.resolve();
  }

  return getIds()
  .then(indexPatterns => {
    const indexPatternsExist = Array.isArray(indexPatterns) && indexPatterns.length > 0;

    if (indexPatternsExist) {
      return handleExistingIndexPatternsScenario(indexPatterns, currentRoute, config);
    }

    if (hasOptedOutOfGettingStarted()) {
      return handleGettingStartedOptedOutScenario(currentRoute, kbnUrl);
    }

    return showGettingStartedPage(kbnUrl, isOnGettingStartedPage);
  });
}

// Start out with the chrome not being shown to prevent a flicker by
// hiding it later
uiChrome.setVisible(false);
uiRoutes.addSetupWork((Private, $injector) => {
  const getIds = Private(IndexPatternsGetIdsProvider);
  const kbnUrl = Private(KbnUrlProvider);
  const config = $injector.get('config');
  const $route = $injector.get('$route');
  return gettingStartedGateCheck(getIds, kbnUrl, config, $route);
});