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

import React, { Component } from 'react';
// import { FormattedMessage } from '@kbn/i18n/react';

export class AdvancedSettingsVoiceAnnouncement extends Component {

  constructor() {
    super();
    this.state = { isDelaying: true };
    this.delayID = null;
  }

  turnDelayOff = () => {
    this.setState({ isDelaying: false });
  };

  resetDelayOffTiming = (needsReset) => {
    if (!needsReset) { return; }
    clearTimeout(this.delayID);
    this.delayID = setTimeout(() => this.turnDelayOff(), 350);
  };

  static getDerivedStateFromProps(props) {
    const filteredSections = Object.values(props.settings).map(setting => setting.map(option => option.ariaName));
    const filteredOptions = [].concat(...filteredSections);
    return {
      filteredSections,
      filteredOptions,
      query: props.query.text
    };
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    const needsReset = nextState.query !== this.state.query;
    this.resetDelayOffTiming(needsReset);
    return !nextState.isDelaying && !needsReset;
  };

  render() {
    if (this.state.query === '') { return null; }
    return (
      <div role="region" aria-live="polite">
        asd
        {/*<FormattedMessage
          id="xpack.settings.AdvancedSettings.voiceAnnouncement"
          defaultMessage="You searched for {query}. There {are} {optionLenght} {options} in {sectionLenght} {sections}"
          values={{
            query: this.state.query,
            sectionLenght: this.state.filteredSections.length,
            are: this.state.filteredOptions.length > 1 ? 'are' : 'is',
            optionLenght: this.state.filteredOptions.length,
            options: this.state.filteredOptions.length > 1 ? 'options' : 'option',
            sections: this.state.filteredSections.length > 1 ? 'sections' : 'section'
          }}
        />*/}
      </div>
    );
  }
}
