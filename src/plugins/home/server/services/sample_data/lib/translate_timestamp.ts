/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

function iso8601ToDateIgnoringTime(iso8601: string) {
  const split = iso8601.split('-');
  if (split.length < 3) {
    throw new Error('Unexpected timestamp format, expecting YYYY-MM-DDTHH:mm:ss');
  }
  const year = parseInt(split[0], 10);
  const month = parseInt(split[1], 10) - 1; // javascript months are zero-based indexed
  const date = parseInt(split[2], 10);
  return new Date(year, month, date);
}

export function dateToIso8601IgnoringTime(date: Date) {
  // not using "Date.toISOString" because only using Date methods that deal with local time
  const dateItem = new Date(date);
  const year = dateItem.getFullYear();
  const month = dateItem.getMonth() + 1;
  const monthString = String.prototype.padStart.call(month, 2, '0');
  const dateString = String.prototype.padStart.call(dateItem.getDate(), 2, '0');
  return `${year}-${monthString}-${dateString}`;
}

// Translate source timestamp by targetReference timestamp,
// preserving the distance between source and sourceReference
export function translateTimeRelativeToDifference(
  source: string,
  sourceReference: any,
  targetReference: any
) {
  const sourceDate = iso8601ToDateIgnoringTime(source);
  const sourceReferenceDate = iso8601ToDateIgnoringTime(sourceReference);
  const targetReferenceDate = iso8601ToDateIgnoringTime(targetReference);

  const timeDelta = sourceDate.getTime() - sourceReferenceDate.getTime();
  const translatedDate = new Date(targetReferenceDate.getTime() + timeDelta);

  return `${dateToIso8601IgnoringTime(translatedDate)}T${source.substring(11)}`;
}

// Translate source timestamp by targetReference timestamp,
// preserving the week distance between source and sourceReference and day of week of the source timestamp
export function translateTimeRelativeToWeek(
  source: string,
  sourceReference: any,
  targetReference: any
) {
  const sourceReferenceDate = iso8601ToDateIgnoringTime(sourceReference);
  const targetReferenceDate = iso8601ToDateIgnoringTime(targetReference);

  // If these dates were in the same week, how many days apart would they be?
  const dayOfWeekDelta = sourceReferenceDate.getDay() - targetReferenceDate.getDay();

  // Given that we assume the target reference is in the same week as the source reference
  // and we'd computed how many days apart they'd be apart.
  // We then compute the value of the days apart in milliseconds to normalize our target reference
  const normalizationDelta = dayOfWeekDelta * MILLISECONDS_IN_DAY;

  const normalizedTargetReference = dateToIso8601IgnoringTime(
    new Date(targetReferenceDate.getTime() + normalizationDelta)
  );

  return translateTimeRelativeToDifference(source, sourceReference, normalizedTargetReference);
}
