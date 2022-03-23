/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const ActionCardsStyles = (euiSize: number, isMobile: boolean) => {
  return {
    '&:only-child': {
      minWidth: isMobile ? 'auto' : euiSize * 22.5,
    },
  };
};

export const ActionCardsGridStyles = () => {
  return {
    justifyContent: 'space-around',
  };
};
