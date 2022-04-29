"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSpaceIdForBeatsTutorial = getSpaceIdForBeatsTutorial;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Returns valid configuration for a beat.yml file for adding the space id
 * if there is an active space and that space is not the default one.
 *
 * @param {object} context - Context object generated from tutorial factory (see #22760)
 */
function getSpaceIdForBeatsTutorial(context) {
  if (!context || !context.spaceId || context.isInDefaultSpace) {
    return '';
  }

  return `  space.id: "${context.spaceId}"`;
}