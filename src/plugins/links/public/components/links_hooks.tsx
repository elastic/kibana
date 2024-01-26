/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useContext, useEffect, useState } from 'react';

import { LinksAttributes } from '../../common/content_management';
import { LinksContext, LinksEmbeddable } from '../embeddable/links_embeddable';

export const useLinks = (): LinksEmbeddable => {
  const linksEmbeddable = useContext<LinksEmbeddable | null>(LinksContext);
  if (linksEmbeddable == null) {
    throw new Error('useLinks must be used inside LinksContext.');
  }
  return linksEmbeddable!;
};

export const useLinksAttributes = (): LinksAttributes | undefined => {
  const linksEmbeddable = useLinks();
  const [attributes, setAttributes] = useState<LinksAttributes | undefined>(
    linksEmbeddable.attributes
  );

  useEffect(() => {
    const attributesSubscription = linksEmbeddable.attributes$.subscribe((newAttributes) => {
      setAttributes(newAttributes);
    });
    return () => {
      attributesSubscription.unsubscribe();
    };
  }, [linksEmbeddable.attributes$]);

  return attributes;
};
