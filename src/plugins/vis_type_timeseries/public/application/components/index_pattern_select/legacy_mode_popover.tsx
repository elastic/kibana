/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { EuiButtonIcon, EuiPopover, EuiButton, EuiCallOut } from '@elastic/eui';
import { getCoreStart } from '../../../services';

export const LegacyModePopover = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onButtonClick = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);

  const navigateToCreateIndexPatterns = () => {
    const core = getCoreStart();
    core.application.navigateToApp('management', {
      path: `/kibana/indexPatterns/create`,
    });
  };

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType={'alert'}
          color={'warning'}
          aria-label="Gear this"
          onClick={onButtonClick}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <EuiCallOut title="Text indexes are deprecated." color="warning" iconType="help" size="s">
        <p>To support all features, we recommend using Kibana Index Pattern.</p>
        <EuiButton iconType="plusInCircle" size="s" onClick={navigateToCreateIndexPatterns}>
          Create index pattern
        </EuiButton>
      </EuiCallOut>
    </EuiPopover>
  );
};
