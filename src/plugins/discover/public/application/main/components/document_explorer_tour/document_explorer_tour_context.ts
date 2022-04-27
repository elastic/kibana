/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext } from 'react';
import { EuiTourStepProps } from '@elastic/eui';

export interface DocumentExplorerTourContextProps {
  onStartTour: () => void;
  onNextTourStep: () => void;
  onFinishTour: () => void;
  getStepProps: (step: number) => Partial<EuiTourStepProps>;
}

export const DocumentExplorerTourContext = createContext<DocumentExplorerTourContextProps>({
  onStartTour: () => {},
  onNextTourStep: () => {},
  onFinishTour: () => {},
  getStepProps: () => ({}),
});

export const useDocumentExplorerTourContext = () => {
  return useContext(DocumentExplorerTourContext);
};
