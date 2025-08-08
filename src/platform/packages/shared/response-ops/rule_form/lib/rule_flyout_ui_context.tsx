/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useState } from 'react';

const initialRuleFlyoutUIContext: {
  onClickClose: (() => void) | null;
  hideCloseButton: boolean;
  setOnClickClose: (onClickClose: () => void) => void;
  setHideCloseButton: (hideCloseButton: boolean) => void;
} = {
  onClickClose: null,
  hideCloseButton: false,
  setOnClickClose: () => {},
  setHideCloseButton: () => {},
};

export const RuleFlyoutUIContext = createContext(initialRuleFlyoutUIContext);

export const RuleFlyoutUIContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [onClickClose, setOnClickClose] = useState<(() => void) | null>(null);
  const [hideCloseButton, setHideCloseButton] = useState<boolean>(false);
  return (
    <RuleFlyoutUIContext.Provider
      value={{
        onClickClose,
        hideCloseButton,
        setOnClickClose,
        setHideCloseButton,
      }}
    >
      {children}
    </RuleFlyoutUIContext.Provider>
  );
};

export const useRuleFlyoutUIContext = () => {
  return React.useContext(RuleFlyoutUIContext);
};
