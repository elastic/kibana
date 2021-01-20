/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { ContainerTooSmall } from '../errors';

/**
 * Common errors shared between constructors
 *
 * @class ErrorHandler
 * @constructor
 */
export class ErrorHandler {
  constructor() {}

  /**
   * Validates the height and width are > 0
   * min size must be at least 1 px
   *
   * @method validateWidthandHeight
   * @param width {Number} HTMLElement width
   * @param height {Number} HTMLElement height
   * @returns {HTMLElement} HTML div with an error message
   */
  validateWidthandHeight(width, height) {
    const badWidth = _.isNaN(width) || width <= 0;
    const badHeight = _.isNaN(height) || height <= 0;

    if (badWidth || badHeight) {
      throw new ContainerTooSmall();
    }
  }
}
