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

/*
    This component aims to insert assertive live region on the page,
    to make sure that a screen reader announces layout changes.

    Due to the fact that it has a specific way of detecting what-and-when announce
    as well as delay of announcement (which depends on what a user is doing at the moment)
    I place a 500ms delay of re-render the text of anouncement.
    That time period is best fits the time of screen reader reaction.
    That anouncement depends on what user is typying into search box as well as
    the speed of ordinary screen reader pronouns what user is typing before start reading this anouncement.

    The order of triggering functions:
    1: React trigs the component to be updated
    2: It places a timer and block render
    3: The time is over
    4: Component renders

    5: If there is another component call, the timer is dropped (cleared).
 */

import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiScreenReaderOnly } from '@elastic/eui';

export class AdvancedSettingsVoiceAnnouncement extends Component {

  constructor() {
    super();

    // The state's isDealying is used to prevent component updating whether the time is not over yet.
    this.state = {
      isDelaying: true,
    };
    this.delayID = null;
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    /*
      If a user typed smth new, we should clear the previous timer
      and start another one + block component rendering.

      When it is reset and delaying is over as well as no new string came,
      it's ready to be rendered.
    */
    const needsReset = nextProps.queryText !== this.props.queryText;
    this.resetDelayOffTiming(needsReset);
    return !nextState.isDelaying && !needsReset;
  };

  resetDelayOffTiming = (needsReset) => {
    /*
      Just clears prev timer and sets another before prev rings
    */
    if (!needsReset) { return; }
    clearTimeout(this.delayID);
    this.delayID = setTimeout(() => this.turnDelayOff(), 500);
  };

  turnDelayOff = () => {
    this.setState({ isDelaying: false });
  };

  componentWillUnmount = () => {
    clearTimeout(this.delayID);
  };

  render() {
    if (this.props.queryText === '') {
      return null;
    }
    const filteredSections = Object.values(this.props.settings).map(setting => setting.map(option => option.ariaName));
    const filteredOptions = [].concat(...filteredSections);
    return (
      <EuiScreenReaderOnly>
        <div role="region" aria-live="polite">
          <FormattedMessage
            id="kbn.settings.advancedSettings.voiceAnnouncement.searchResultScreenReaderMessage"
            defaultMessage="You searched for {query}.
              There {optionLenght, plural, one {is # option} other {are # options}}
              in {sectionLenght, plural, one {# section} other {# sections}}"
            values={{
              query: this.props.queryText,
              sectionLenght: filteredSections.length,
              optionLenght: filteredOptions.length
            }}
          />
        </div>
      </EuiScreenReaderOnly>
    );
  }
}
