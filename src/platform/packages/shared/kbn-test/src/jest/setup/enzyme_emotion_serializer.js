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

const util = require('util');

module.exports = {
  test(val) {
    // Check if this is a shallow-rendered Enzyme wrapper containing an Emotion component
    // We need to check for the Enzyme wrapper structure and Emotion internals
    
    // DEEP INSPECTION: Log the actual structure of what we receive
    try {
      const valType = typeof val;
      const isNull = val === null;
      const isArray = Array.isArray(val);
      
      console.log(`[test-enzyme-emotion-serializer] ====== RECEIVED VALUE ======`);
      console.log(`[test-enzyme-emotion-serializer] typeof: ${valType}, isNull: ${isNull}, isArray: ${isArray}`);
      
      if (valType === 'string' && val === '[object Object]') {
        console.log(`[test-enzyme-emotion-serializer] ⚠️  STRING VALUE: "${val}" (this is a stringified object)`);
        console.log(`[test-enzyme-emotion-serializer] Stack trace to see who stringified it:`);
        console.trace();
      } else if (valType === 'object' && !isNull) {
        // Show the actual object structure
        console.log(`[test-enzyme-emotion-serializer] Object keys:`, Object.keys(val));
        console.log(`[test-enzyme-emotion-serializer] Object.type:`, val.type);
        console.log(`[test-enzyme-emotion-serializer] Object.props keys:`, val.props ? Object.keys(val.props) : 'no props');
        
        // Deep inspect with util
        console.log(`[test-enzyme-emotion-serializer] Full structure:`, util.inspect(val, { depth: 2, colors: false }));
      }
      console.log(`[test-enzyme-emotion-serializer] ====== END RECEIVED VALUE ======`);
    } catch (e) {
      console.log(`[test-enzyme-emotion-serializer] Error inspecting value:`, e.message);
    }
    
    // Quick checks for invalid values
    // Note: Stringified objects like "[object Object]" will fail the typeof check
    if (!val || typeof val !== 'object') {
      return false;
    }
    
    // Must have type and props to be a valid React element
    if (!val.type || !val.props) {
      return false;
    }
    
    

    // Check if this is an Enzyme ShallowWrapper with Emotion props
    if (val.type && val.props && val.props.__EMOTION_TYPE_PLEASE_DO_NOT_USE__) {
      console.log(`[test-enzyme-emotion-serializer] Matched Emotion component with __EMOTION_TYPE_PLEASE_DO_NOT_USE__:`, val.type);
      return true;
    }

    // Also check for components with a css prop (function, object, or string)
    // These are Emotion-styled components that need css prop normalization
    // BUT skip if css is already the processed string "unknown styles" to avoid infinite recursion
    if (val.type && val.props && val.props.css && val.props.css !== 'unknown styles') {
      console.log(`[test-enzyme-emotion-serializer] Matched component with css prop:`, val.type, typeof val.props.css);
      return true;
    }

    return false;
  },
  serialize(val, config, indentation, depth, refs, printer) {
    const props = { ...val.props };

    // Get the original component type before we modify props
    const emotionType = props.__EMOTION_TYPE_PLEASE_DO_NOT_USE__;

    // Simplify the css prop to match the old snapshot format
    // Handle css as object, function, or any truthy value
    if (props.css) {
      console.log(`[serialize-enzyme-emotion-serializer] Simplifying css prop (type: ${typeof props.css}):`, props.css);
      props.css = 'unknown styles';
    }

    // Remove Emotion internals from props
    delete props.__EMOTION_TYPE_PLEASE_DO_NOT_USE__;

    // Try to get the original component name from Emotion's internal type
    let componentName = null;
    if (emotionType) {
      console.log(
        `[serialize-enzyme-emotion-serializer] Extracting component name from:`,
        emotionType
      );
      // If emotionType is a string (like 'div', 'span'), use it directly
      if (typeof emotionType === 'string') {
        console.log(`[serialize-enzyme-emotion-serializer] emotionType is a string:`, emotionType);
        componentName = emotionType;
      }
      // Emotion wraps components, try to get the display name
      else if (emotionType.displayName) {
        console.log(
          `[serialize-enzyme-emotion-serializer] Found displayName:`,
          emotionType.displayName
        );
        componentName = emotionType.displayName;
      } else if (emotionType.name) {
        console.log(`[serialize-enzyme-emotion-serializer] Found name:`, emotionType.name);
        componentName = emotionType.name;
      } else if (typeof emotionType === 'function' && emotionType.render) {
        console.log(
          `[serialize-enzyme-emotion-serializer] Extracting from render function:`,
          emotionType.render
        );
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
