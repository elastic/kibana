/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const minimatch = require('minimatch');

/**
 * Remove consumed path segments from a pattern
 * @param {string} pattern - Glob pattern
 * @param {string[]} pathSegments - Path segments to consume
 * @returns {string|null} Transformed pattern or null if not applicable
 */
function removeConsumedSegments(pattern, pathSegments) {
  const patternParts = pattern.split('/');
  let patternIndex = 0;
  let segmentIndex = 0;

  while (segmentIndex < pathSegments.length && patternIndex < patternParts.length) {
    const segment = pathSegments[segmentIndex];
    const patternPart = patternParts[patternIndex];

    if (patternPart === '**') {
      // Special handling for globstar
      if (patternIndex === patternParts.length - 1) {
        // ** is the last part - consume all remaining segments
        return '**/*';
      }

      // Look for the next pattern part in remaining segments
      const nextPatternPart = patternParts[patternIndex + 1];
      const foundIndex = findPatternPartInSegments(nextPatternPart, pathSegments, segmentIndex);

      if (foundIndex !== -1) {
        // Found the next pattern part - skip to it
        segmentIndex = foundIndex;
        patternIndex++; // Move past the **
        continue;
      } else {
        // Next pattern part not found - ** consumes this segment
        // but preserve ** semantic in result
        segmentIndex++; // Consume current segment
        // DON'T advance patternIndex - keep the ** for the result

        // If we've consumed all segments, return from ** onwards
        if (segmentIndex >= pathSegments.length) {
          return patternParts.slice(patternIndex).join('/');
        }
      }
    } else if (patternPart === segment) {
      // Exact match
      patternIndex++;
      segmentIndex++;
    } else if (matchesPatternPart(segment, patternPart)) {
      // Wildcard/extglob match
      patternIndex++;
      segmentIndex++;
    } else {
      // No match possible
      return null;
    }
  }

  // Return remaining pattern parts
  if (patternIndex < patternParts.length) {
    return patternParts.slice(patternIndex).join('/');
  }

  // All pattern consumed - return default
  return '**/*';
}

/**
 * Find where a pattern part matches in the segments
 * @param {string} patternPart - Pattern part to find
 * @param {string[]} segments - Segments to search in
 * @param {number} startIndex - Index to start searching from
 * @returns {number} Index where found, or -1 if not found
 */
function findPatternPartInSegments(patternPart, segments, startIndex) {
  for (let i = startIndex; i < segments.length; i++) {
    if (matchesPatternPart(segments[i], patternPart)) {
      return i;
    }
  }
  return -1;
}

/**
 * Test if a segment matches a pattern part - FIXED NEGATED EXTGLOB
 * @param {string} segment - Path segment
 * @param {string} patternPart - Pattern part to test against
 * @returns {boolean} Whether the segment matches the pattern part
 */
function matchesPatternPart(segment, patternPart) {
  // Handle exact match first
  if (segment === patternPart) {
    return true;
  }

  // Handle single wildcard
  if (patternPart === '*') {
    return true;
  }

  // Handle negated extglob patterns manually (minimatch is broken for these)
  if (patternPart.startsWith('!(') && patternPart.endsWith(')')) {
    const innerPattern = patternPart.slice(2, -1); // Remove !( and )

    try {
      let testPattern = innerPattern;

      // Handle alternation patterns - wrap in @() extglob
      if (innerPattern.includes('|') && !innerPattern.includes('(')) {
        testPattern = `@(${innerPattern})`;
      }

      // Test if segment matches the inner pattern, then negate the result
      const innerMatches = minimatch(segment, testPattern, {
        dot: true,
        nobrace: true,
        noglobstar: true,
      });
      return !innerMatches; // Return opposite of inner match
    } catch (error) {
      console.warn(
        `Negated extglob matching failed for '${segment}' against '${patternPart}'`,
        error
      );
      return false; // Conservative fallback
    }
  }

  // Handle other extglob patterns (these work in minimatch)
  if (
    patternPart.includes('?(') ||
    patternPart.includes('*(') ||
    patternPart.includes('+(') ||
    patternPart.includes('@(')
  ) {
    try {
      return minimatch(segment, patternPart, {
        dot: true,
        noext: false,
        nobrace: true,
        noglobstar: true,
      });
    } catch (error) {
      console.warn(`Extglob matching failed for '${segment}' against '${patternPart}'`, error);
      return false;
    }
  }

  // Handle other patterns with magic characters
  if (patternPart.includes('*') || patternPart.includes('?') || patternPart.includes('[')) {
    try {
      return minimatch(segment, patternPart, {
        dot: true,
        nobrace: true,
        noglobstar: true,
      });
    } catch (error) {
      console.warn(`Pattern matching failed for '${segment}' against '${patternPart}'`, error);
      return false;
    }
  }

  // Literal non-match
  return false;
}

module.exports = {
  removeConsumedSegments,
  matchesPatternPart,
};
