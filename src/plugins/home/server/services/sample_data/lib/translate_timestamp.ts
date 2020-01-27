/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const MILLISECONDS_IN_DAY = 86400000;

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
  const monthString = month < 10 ? `0${month}` : `${month}`;
  const dateString = dateItem.getDate() < 10 ? `0${dateItem.getDate()}` : `${dateItem.getDate()}`;
  return `${year}-${monthString}-${dateString}`;
}

// Translate source timestamp by targetReference timestamp,
// perserving the distance between source and sourceReference
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
// perserving the week distance between source and sourceReference and day of week of the source timestamp
export function translateTimeRelativeToWeek(
  source: string,
  sourceReference: any,
  targetReference: any
) {
  const sourceReferenceDate = iso8601ToDateIgnoringTime(sourceReference);
  const targetReferenceDate = iso8601ToDateIgnoringTime(targetReference);

  // If these dates were in the same week, how many days apart would they be?
  const dayOfWeekDelta = sourceReferenceDate.getDay() - targetReferenceDate.getDay();

  // If we pretend that the targetReference is actually the same day of the week as the
  // sourceReference, then we can translate the source to the target while preserving their
  // days of the week.
  const normalizationDelta = dayOfWeekDelta * MILLISECONDS_IN_DAY;
  const normalizedTargetReference = dateToIso8601IgnoringTime(
    new Date(targetReferenceDate.getTime() + normalizationDelta)
  );

  return translateTimeRelativeToDifference(source, sourceReference, normalizedTargetReference);
}
