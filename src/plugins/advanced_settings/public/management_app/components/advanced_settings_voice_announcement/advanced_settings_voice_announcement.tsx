/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiScreenReaderOnly, EuiDelayRender } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldSetting } from '../../types';

interface Props {
  queryText: string;
  settings: Record<string, FieldSetting[]>;
}

export class AdvancedSettingsVoiceAnnouncement extends Component<Props> {
  shouldComponentUpdate = (nextProps: Props) => {
    /*
      If a user typed smth new, we should clear the previous timer
      and start another one + block component rendering.

      When it is reset and delaying is over as well as no new string came,
      it's ready to be rendered.
    */
    return nextProps.queryText !== this.props.queryText;
  };

  render() {
    const filteredSections = Object.values(this.props.settings).map((setting) =>
      setting.map((option) => option.ariaName)
    );
    const filteredOptions = [...filteredSections];
    return (
      <EuiScreenReaderOnly>
        <div
          role="region"
          aria-live="polite"
          aria-label={i18n.translate('advancedSettings.voiceAnnouncement.ariaLabel', {
            defaultMessage: 'Advanced Settings results info',
          })}
        >
          <EuiDelayRender>
            {this.props.queryText ? (
              <FormattedMessage
                id="advancedSettings.voiceAnnouncement.searchResultScreenReaderMessage"
                defaultMessage="You searched for {query}. There {optionLenght, plural, one {is # option} other {are # options}} in {sectionLenght, plural, one {# section} other {# sections}}"
                values={{
                  query: this.props.queryText,
                  sectionLenght: filteredSections.length,
                  optionLenght: filteredOptions.length,
                }}
              />
            ) : (
              <FormattedMessage
                id="advancedSettings.voiceAnnouncement.noSearchResultScreenReaderMessage"
                defaultMessage="There {optionLenght, plural, one {is # option} other {are # options}} in {sectionLenght, plural, one {# section} other {# sections}}"
                values={{
                  sectionLenght: filteredSections.length,
                  optionLenght: filteredOptions.length,
                }}
              />
            )}
          </EuiDelayRender>
        </div>
      </EuiScreenReaderOnly>
    );
  }
}
