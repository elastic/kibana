/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// hard code the duration to 30 days for now
const activePeriodDurationInMilliseconds = 30 * 24 * 60 * 60 * 1000;
export const calculateIsActivePeriod = (creationDate?: string): boolean => {
  if (!creationDate) return false;
  const parsedCreationDate = Date.parse(creationDate);
  const endOfActivePeriodDate = new Date(parsedCreationDate + activePeriodDurationInMilliseconds);
  const now = new Date();
  return now < endOfActivePeriodDate;
};
