/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { TextBasedLanguagesPluginStart } from './types';

type Start = jest.Mocked<TextBasedLanguagesPluginStart>;

export const textBasedLanguagesPluginMock = {
  createStartContract: (): Start => {
    const startContract: Start = {
      Editor: jest.fn(() => {
        return <span data-test-subj="textBasedLanguagesEditor">Text based languages editor</span>;
      }),
    };
    return startContract;
  },
};
