import * as React from 'react';
import useObservable from 'react-use/lib/useObservable';
import type {ContentCache} from '../service/cache/content_cache';
import type {ContentRegistry} from '../service/registry/content_registry';

export interface ContentContextValue {
  cache: ContentCache;
  registry: ContentRegistry;
}

export const context = React.createContext<ContentContextValue | null>(null);

export const useContent = () => React.useContext(context)!;

export const useContentItem = <T = unknown>(id: string) => {
  const { cache } = useContent();
  const item = React.useState(() => cache.item(id));
  const data = useObservable(item[0].data);

  return {
    item,
    data,
  };
};

