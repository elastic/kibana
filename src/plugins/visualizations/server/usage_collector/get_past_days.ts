/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const getPastDays = (dateString: string): number => {
  const date = new Date(dateString);
  const today = new Date();
  const diff = Math.abs(date.getTime() - today.getTime());
  return Math.trunc(diff / (1000 * 60 * 60 * 24));
};
