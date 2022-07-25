/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { ApiItem, NewsfeedItem } from '../types';
import { NEWSFEED_FALLBACK_LANGUAGE } from '../../common/constants';

export const convertItems = (items: ApiItem[], userLanguage: string): NewsfeedItem[] => {
  return items
    .filter(validatePublishedDate)
    .map((item) => localizeItem(item, userLanguage))
    .filter(validateIntegrity);
};

export const validatePublishedDate = (item: ApiItem): boolean => {
  if (moment(item.expire_on).isBefore(Date.now())) {
    return false; // ignore item if expired
  }

  if (moment(item.publish_on).isAfter(Date.now())) {
    return false; // ignore item if publish date hasn't occurred yet (pre-published)
  }
  return true;
};

export const localizeItem = (rawItem: ApiItem, userLanguage: string): NewsfeedItem => {
  const {
    expire_on: expireOnUtc,
    publish_on: publishOnUtc,
    languages,
    title,
    description,
    link_text: linkText,
    link_url: linkUrl,
    badge,
    hash,
  } = rawItem;

  let chosenLanguage = userLanguage;
  if (!languages || !languages.includes(chosenLanguage)) {
    chosenLanguage = NEWSFEED_FALLBACK_LANGUAGE; // don't remove the item: fallback on a language
  }

  return {
    title: title[chosenLanguage],
    description: description[chosenLanguage],
    linkText: linkText != null ? linkText[chosenLanguage] : null,
    linkUrl: linkUrl[chosenLanguage],
    badge: badge != null ? badge![chosenLanguage] : null,
    publishOn: moment(publishOnUtc),
    expireOn: moment(expireOnUtc),
    hash: hash.slice(0, 10), // optimize for storage and faster parsing
  };
};

export const validateIntegrity = (item: Partial<NewsfeedItem>): boolean => {
  const hasMissing = [
    item.title,
    item.description,
    item.linkText,
    item.linkUrl,
    item.publishOn,
    item.hash,
  ].includes(undefined);

  return !hasMissing;
};
