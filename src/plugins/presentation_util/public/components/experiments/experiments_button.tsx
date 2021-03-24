/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { EuiButtonIcon } from '@elastic/eui';

import { ExperimentsPopover } from './experiments_popover';

export const ExperimentsButton = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => setIsPopoverOpen((open) => !open);
  const closePopover = () => setIsPopoverOpen(false);

  const button = <EuiButtonIcon iconType="beaker" onClick={onButtonClick} />;

  return <ExperimentsPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover} />;
};
