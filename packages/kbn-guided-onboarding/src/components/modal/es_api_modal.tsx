/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiModal } from '@elastic/eui';
import React, { ReactNode } from 'react';

interface ESApiModalProps {
  onClose: () => void;
  title: ReactNode;
}

export const ESApiModal = ({ onClose, title }: ESApiModalProps) => {
  console.log('can this open?');
  return (
    <EuiModal onClose={onClose} data-test-subj="guideModal" aria-labelledby="">
      <title />
      Can this open? this is a placeholder
    </EuiModal>
  );
};
