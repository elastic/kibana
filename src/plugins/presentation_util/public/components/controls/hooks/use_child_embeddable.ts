/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect, useState } from 'react';
import { InputControlEmbeddable } from '../types';
import { IContainer } from '../../../../../embeddable/public';

export const useChildEmbeddable = ({
  container,
  embeddableId,
}: {
  container: IContainer;
  embeddableId: string;
}) => {
  const [embeddable, setEmbeddable] = useState<InputControlEmbeddable>();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const newEmbeddable = await container.untilEmbeddableLoaded(embeddableId);
      if (!mounted) return;
      setEmbeddable(newEmbeddable);
    })();
    return () => {
      mounted = false;
    };
  }, [container, embeddableId]);

  return embeddable;
};
