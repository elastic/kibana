/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { logger } from '../../lib/logger';
import { isPlainObjectType } from '../lib/is_plain_object_type';
import { DocumentNodeProcessor } from '../types';
import { hasProp } from './lib/has_prop';
import { inlineRef } from './lib/inline_ref';
import { X_MODIFY } from './lib/known_custom_props';

/**
 * Creates a node processor to modify a node by add or extending `required` property
 * when `x-modify: required` property is presented in the node.
 */
export function createModifyRequiredProcessor(): DocumentNodeProcessor {
  return {
    ref(node, resolvedRef) {
      if (!hasProp(node, X_MODIFY, 'required')) {
        return;
      }

      if (!hasProp(resolvedRef.refNode, 'properties')) {
        logger.warning(
          `Unable to apply ${chalk.blueBright(X_MODIFY)} to ${chalk.cyan(
            resolvedRef.pointer
          )} because ${chalk.blueBright('properties')} property was not found`
        );
        return;
      }

      if (!isPlainObjectType(resolvedRef.refNode.properties)) {
        logger.warning(
          `Unable to apply ${chalk.blueBright(X_MODIFY)} to ${chalk.cyan(
            resolvedRef.pointer
          )} because ${chalk.blueBright('properties')} property was not an object`
        );
        return;
      }

      // Inline the ref node because we are gonna modify it
      inlineRef(node, resolvedRef);

      node.required = Object.keys(resolvedRef.refNode.properties);
    },
    leave(node) {
      if (!hasProp(node, X_MODIFY, 'required')) {
        return;
      }

      if (!hasProp(node, 'properties')) {
        logger.warning(
          `Unable to apply ${chalk.blueBright(X_MODIFY)} to ${chalk.cyan(
            node
          )} because ${chalk.blueBright('properties')} property was not found`
        );
        return;
      }

      if (!isPlainObjectType(node.properties)) {
        logger.warning(
          `Unable to apply ${chalk.blueBright(X_MODIFY)} to ${chalk.cyan(
            node
          )} because ${chalk.blueBright('properties')} property was not an object`
        );
        return;
      }

      node.required = Object.keys(node.properties);
    },
  };
}
