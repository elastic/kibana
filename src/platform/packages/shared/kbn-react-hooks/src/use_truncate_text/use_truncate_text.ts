/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useMemo } from 'react';

export const useTruncateText = (
  text: string,
  maxLength: number = 500,
  maxCharLength: number = maxLength
) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const shouldTruncate = text?.length > maxLength;
  const displayText = useMemo(() => {
    if (!shouldTruncate || isExpanded) return text;
    return `${text?.slice(0, maxCharLength)}...`;
  }, [text, shouldTruncate, isExpanded, maxCharLength]);

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  return { displayText, isExpanded, toggleExpanded, shouldTruncate };
};
