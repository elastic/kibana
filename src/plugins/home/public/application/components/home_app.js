/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import PropTypes from 'prop-types';
import { Home } from './home';
import { TutorialDirectory } from './tutorial_directory';
import { Tutorial } from './tutorial/tutorial';
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import { getTutorial } from '../load_tutorials';
import { replaceTemplateStrings } from './tutorial/replace_template_strings';
import { getServices } from '../kibana_services';

const REDIRECT_TO_INTEGRATIONS_TAB_IDS = ['all', 'logging', 'metrics', 'security'];

export function HomeApp({ directories, solutions }) {
  const {
    application,
    savedObjectsClient,
    getBasePath,
    addBasePath,
    environmentService,
    dataViewsService,
  } = getServices();
  const environment = environmentService.getEnvironment();
  const isCloudEnabled = environment.cloud;

  const renderTutorialDirectory = (props) => {
    // Redirect to integrations app unless a specific tab that is still supported was specified.
    const tabId = props.match.params.tab;
    if (!tabId || REDIRECT_TO_INTEGRATIONS_TAB_IDS.includes(tabId)) {
      application.navigateToApp('integrations', { replace: true });
      return null;
    }

    return (
      <TutorialDirectory
        addBasePath={addBasePath}
        openTab={tabId}
        isCloudEnabled={isCloudEnabled}
      />
    );
  };

  const renderTutorial = (props) => {
    return (
      <Tutorial
        addBasePath={addBasePath}
        isCloudEnabled={isCloudEnabled}
        getTutorial={getTutorial}
        replaceTemplateStrings={replaceTemplateStrings}
        tutorialId={props.match.params.id}
        bulkCreate={savedObjectsClient.bulkCreate}
      />
    );
  };

  return (
    <I18nProvider>
      <Router>
        <Switch>
          <Route path="/tutorial/:id" render={renderTutorial} />
          <Route path="/tutorial_directory/:tab?" render={renderTutorialDirectory} />
          <Route exact path="/">
            <Home
              addBasePath={addBasePath}
              directories={directories}
              solutions={solutions}
              localStorage={localStorage}
              urlBasePath={getBasePath()}
              hasUserDataView={() => dataViewsService.hasUserDataView()}
            />
          </Route>
          <Redirect to="/" />
        </Switch>
      </Router>
    </I18nProvider>
  );
}

HomeApp.propTypes = {
  directories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      subtitle: PropTypes.string,
      description: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
      showOnHomePage: PropTypes.bool.isRequired,
      category: PropTypes.string.isRequired,
      order: PropTypes.number,
      solutionId: PropTypes.string,
    })
  ),
  solutions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      icon: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
      order: PropTypes.number,
    })
  ),
};
