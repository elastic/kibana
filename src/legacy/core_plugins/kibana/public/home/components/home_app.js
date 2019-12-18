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
import PropTypes from 'prop-types';
import { Home } from './home';
import { FeatureDirectory } from './feature_directory';
import { TutorialDirectory } from './tutorial_directory';
import { Tutorial } from './tutorial/tutorial';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { getTutorial } from '../load_tutorials';
import { replaceTemplateStrings } from './tutorial/replace_template_strings';
import { telemetryOptInProvider } from '../kibana_services';
import chrome from 'ui/chrome';

export function HomeApp({ directories }) {
  const isCloudEnabled = chrome.getInjected('isCloudEnabled', false);
  const apmUiEnabled = chrome.getInjected('apmUiEnabled', true);
  const mlEnabled = chrome.getInjected('mlEnabled', false);
  const { setOptInNoticeSeen, getOptIn } = telemetryOptInProvider;
  const savedObjectsClient = chrome.getSavedObjectsClient();

  const renderTutorialDirectory = props => {
    return (
      <TutorialDirectory
        addBasePath={chrome.addBasePath}
        openTab={props.match.params.tab}
        isCloudEnabled={isCloudEnabled}
      />
    );
  };

  const renderTutorial = props => {
    return (
      <Tutorial
        addBasePath={chrome.addBasePath}
        isCloudEnabled={isCloudEnabled}
        getTutorial={getTutorial}
        replaceTemplateStrings={replaceTemplateStrings}
        tutorialId={props.match.params.id}
        bulkCreate={savedObjectsClient.bulkCreate}
      />
    );
  };

  return (
    <Router>
      <Switch>
        <Route path="/home/tutorial/:id" render={renderTutorial} />
        <Route path="/home/tutorial_directory/:tab?" render={renderTutorialDirectory} />
        <Route path="/home/feature_directory">
          <FeatureDirectory addBasePath={chrome.addBasePath} directories={directories} />
        </Route>
        <Route path="/home">
          <Home
            addBasePath={chrome.addBasePath}
            directories={directories}
            apmUiEnabled={apmUiEnabled}
            mlEnabled={mlEnabled}
            find={savedObjectsClient.find}
            localStorage={localStorage}
            urlBasePath={chrome.getBasePath()}
            onOptInSeen={setOptInNoticeSeen}
            getOptInStatus={getOptIn}
          />
        </Route>
      </Switch>
    </Router>
  );
}

HomeApp.propTypes = {
  directories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
      showOnHomePage: PropTypes.bool.isRequired,
      category: PropTypes.string.isRequired,
    })
  ),
};
