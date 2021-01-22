/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiTabs, EuiTab } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

function handleClick(activateTab, tabName) {
  activateTab(tabName);
}

export function TimelionHelpTabs(props) {
  return (
    <EuiTabs size="s">
      <EuiTab
        isSelected={props.activeTab === 'funcref'}
        onClick={() => handleClick(props.activateTab, 'funcref')}
      >
        <FormattedMessage
          id="timelion.help.mainPage.functionReferenceTitle"
          defaultMessage="Function reference"
        />
      </EuiTab>
      <EuiTab
        isSelected={props.activeTab === 'keyboardtips'}
        onClick={() => handleClick(props.activateTab, 'keyboardtips')}
      >
        <FormattedMessage
          id="timelion.help.mainPage.keyboardTipsTitle"
          defaultMessage="Keyboard tips"
        />
      </EuiTab>
    </EuiTabs>
  );
}

TimelionHelpTabs.propTypes = {
  activeTab: PropTypes.string,
  activateTab: PropTypes.func,
};
