/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { detectIE } from './detect_ie';

export const createNumberHandler = (handleChange) => {
  return (name, defaultValue) => (e) => {
    if (!detectIE() || e.keyCode === 13) e.preventDefault();

    const value = Number(_.get(e, 'target.value', defaultValue));
    return handleChange?.({ [name]: value });
  };
};
