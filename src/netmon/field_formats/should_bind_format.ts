/*
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

const bindableFieldNames = ['Attach', 'Captured'];

export const shouldBindFormat = (fieldName: string) => bindableFieldNames.includes(fieldName);
