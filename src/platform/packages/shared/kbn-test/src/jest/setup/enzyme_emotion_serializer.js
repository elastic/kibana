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
 * This must run BEFORE enzyme-to-json to properly transform Emotion components.
 *
 * The problem: When using Enzyme's shallow() with Emotion-styled components,
 * the component's internal structure (ForwardRef, __EMOTION_TYPE_PLEASE_DO_NOT_USE__)
 * gets exposed in snapshots. This serializer intercepts those components and
 * transforms them to match the expected format before enzyme-to-json processes them.
 */
module.exports = {
  test(val) {
    // Check if this is a shallow-rendered Enzyme wrapper containing an Emotion component
    // We need to check for the Enzyme wrapper structure and Emotion internals
    if (!val || typeof val !== 'object') {
      return false;
    }

    // Check if this is an Enzyme ShallowWrapper with Emotion props
    if (val.type && val.props && val.props.__EMOTION_TYPE_PLEASE_DO_NOT_USE__) {
      return true;
    }

    return false;
  },
  serialize(val, config, indentation, depth, refs, printer) {
    const props = { ...val.props };

    // Get the original component type before we modify props
    const emotionType = props.__EMOTION_TYPE_PLEASE_DO_NOT_USE__;

    // Simplify the css prop to match the old snapshot format
    if (props.css && typeof props.css === 'object') {
      props.css = 'unknown styles';
    }

    // Remove Emotion internals from props
    delete props.__EMOTION_TYPE_PLEASE_DO_NOT_USE__;

    // Try to get the original component name from Emotion's internal type
    let componentName = null;
    if (emotionType) {
      // If emotionType is a string (like 'div', 'span'), use it directly
      if (typeof emotionType === 'string') {
        componentName = emotionType;
      }
      // Emotion wraps components, try to get the display name
      else if (emotionType.displayName) {
        componentName = emotionType.displayName;
      } else if (emotionType.name) {
        componentName = emotionType.name;
      } else if (typeof emotionType === 'function' && emotionType.render) {
        componentName = emotionType.render.displayName || emotionType.render.name;
      }
    }

    // Return the cleaned up component structure
    // Only replace the type if we successfully extracted a component name
    return printer(
      {
        ...val,
        type: componentName || val.type, // Preserve original type if we couldn't extract one
        props,
      },
      config,
      indentation,
      depth,
      refs
    );
  },
};
