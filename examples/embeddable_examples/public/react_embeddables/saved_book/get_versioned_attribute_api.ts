/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateManager } from '@kbn/presentation-publishing/state_manager/types';
import { BookAttributes, BookAttributesV3, BookAttributesV2, BookAttributesV1 } from './types';

const getAttributeApiV3 = (attributesManager: StateManager<BookAttributesV3>) => ({
  setBookTitle: attributesManager.api.setBookTitle,
  setAuthor: attributesManager.api.setAuthor,
  setPages: attributesManager.api.setPages,
  setSynopsis: attributesManager.api.setSynopsis,
  setPublished: attributesManager.api.setPublished,
});

const getAttributeApiV2 = (attributesManager: StateManager<BookAttributesV2>) => ({
  setBookTitle: attributesManager.api.setBookTitle,
  setAuthor: attributesManager.api.setAuthor,
  setPages: attributesManager.api.setNumberOfPages,
  setSynopsis: attributesManager.api.setSynopsis,
  setPublished: attributesManager.api.setPublicationYear,
});

const getAttributeApiV1 = (attributesManager: StateManager<BookAttributesV1>) => ({
  setBookTitle: attributesManager.api.setBookTitle,
  setAuthor: attributesManager.api.setAuthorName,
  setPages: attributesManager.api.setNumberOfPages,
  setSynopsis: attributesManager.api.setBookSynopsis,
  setPublished: () => {},
});

export const getVersionedAttributeApi = (
  apiVersion: number,
  attributesManager: StateManager<BookAttributes>
) =>
  apiVersion === 3
    ? getAttributeApiV3(attributesManager as StateManager<BookAttributesV3>)
    : apiVersion === 2
    ? getAttributeApiV2(attributesManager as StateManager<BookAttributesV2>)
    : getAttributeApiV1(attributesManager as StateManager<BookAttributesV1>);
