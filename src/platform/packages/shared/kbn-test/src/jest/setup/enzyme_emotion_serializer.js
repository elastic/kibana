/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Custom serializer to handle Emotion-styled components in Enzyme shallow renders.
 * This runs AFTER enzyme-to-json to clean up Emotion's internal structures.
 *
 * The problem: When using Enzyme's shallow() with Emotion-styled components (Emotion 11.12+),
 * the component's internal structure (ForwardRef with __EMOTION_TYPE_PLEASE_DO_NOT_USE__)
 * gets exposed in snapshots. This serializer transforms them back to the original component name.
 *
 * Example: <ForwardRef __EMOTION_TYPE_PLEASE_DO_NOT_USE__="dl"> → <dl>
 */

module.exports = {
  test(val) {
    // After enzyme-to-json, match plain objects that represent Emotion's ForwardRef wrappers
    
    // Skip if not an object
    if (!val || typeof val !== 'object') {
      return false;
    }

    // Must have type and props (enzyme-to-json output structure)
    if (!val.type || !val.props || typeof val.props !== 'object') {
      return false;
    }

    // CRITICAL: Only match if this is a ForwardRef with Emotion's internal property
    // This is the specific structure from Emotion 11.12+ after enzyme-to-json processes it
    if (val.type === 'ForwardRef' && val.props.__EMOTION_TYPE_PLEASE_DO_NOT_USE__) {
      return true;
    }

    return false;
  },
  serialize(val, config, indentation, depth, refs, printer) {
    try {
      // Clone props and extract the original component type
      const props = { ...val.props };
      const originalType = props.__EMOTION_TYPE_PLEASE_DO_NOT_USE__;

      // Remove Emotion's internal property from props
      delete props.__EMOTION_TYPE_PLEASE_DO_NOT_USE__;

      // Return the cleaned structure with the original component type
      return printer(
        {
          ...val,
          type: originalType, // Use the original type (e.g., 'dl', 'span', etc.)
          props,
        },
        config,
        indentation,
        depth,
        refs
      );
    } catch (error) {
      // If serialization fails, fall back to printing the original value
      // This prevents the serializer from breaking tests
      return printer(val, config, indentation, depth, refs);
    }
  },
};
