/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { EuiLoadingChart } from '@elastic/eui';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { useNavigationEmbeddable } from '../embeddable/navigation_container';
import { LinkEmbeddable } from '../../types';

export interface NavigationEmbeddableLinkProps {
  embeddableId: string;
  embeddableType: string;
}

/** TODO: This is copied from the control group; maybe make it generic and extract it so we aren't duplicating this code */
export const useChildEmbeddable = ({
  untilEmbeddableLoaded,
  embeddableId,
  embeddableType,
}: {
  untilEmbeddableLoaded: (embeddableId: string) => Promise<LinkEmbeddable>;
  embeddableId: string;
  embeddableType: string;
}) => {
  const [embeddable, setEmbeddable] = useState<LinkEmbeddable>();

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
  }, [untilEmbeddableLoaded, embeddableId, embeddableType]);

  return embeddable;
};

export const NavigationEmbeddableLink = ({
  embeddableId,
  embeddableType,
}: NavigationEmbeddableLinkProps) => {
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  const navEmbeddable = useNavigationEmbeddable();

  const embeddable = useChildEmbeddable({
    untilEmbeddableLoaded: navEmbeddable.untilEmbeddableLoaded.bind(navEmbeddable),
    embeddableType,
    embeddableId,
  });

  useEffect(() => {
    if (embeddableRoot.current) {
      embeddable?.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot]);

  return (
    <>
      {embeddable && (
        <div ref={embeddableRoot}>{isErrorEmbeddable(embeddable) && <>ERROR LOADING LINK</>}</div>
      )}
      {!embeddable && (
        <div className="controlFrame--controlLoading">
          <EuiLoadingChart />
        </div>
      )}
    </>
  );
};
