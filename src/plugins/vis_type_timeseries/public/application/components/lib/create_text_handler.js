/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { detectIE } from './detect_ie';

export const createTextHandler = (handleChange) => {
  return (name, defaultValue) => (e) => {
    // IE preventDefault breaks input, but we still need top prevent enter from being pressed
    if (!detectIE() || e.keyCode === 13) e.preventDefault();

    const value = _.get(e, 'target.value', defaultValue);
    return handleChange?.({ [name]: value });
  };
};
