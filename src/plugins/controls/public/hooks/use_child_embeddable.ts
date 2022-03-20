/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect, useState } from 'react';
import { ControlEmbeddable } from '../types';

export const useChildEmbeddable = ({
  untilEmbeddableLoaded,
  embeddableId,
}: {
  untilEmbeddableLoaded: (embeddableId: string) => Promise<ControlEmbeddable>;
  embeddableId: string;
}) => {
  const [embeddable, setEmbeddable] = useState<ControlEmbeddable>();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const newEmbeddable = await untilEmbeddableLoaded(embeddableId);
      if (!mounted) return;
      setEmbeddable(newEmbeddable);
    })();
    return () => {
      mounted = false;
    };
  }, [untilEmbeddableLoaded, embeddableId]);

  return embeddable;
};
