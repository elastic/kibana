import {type Observable, defer, switchMap, of, map} from "rxjs";
import type {ContentCache} from "./content_cache";

export class CachedContentType<T = unknown> {
  constructor(public readonly id: string, protected readonly cache: ContentCache) {}

  public list(): Observable<string[]> {
    const type = defer(() => {
      const type = this.cache.registry.getType(this.id);
      if (!type) throw new Error(`Unknown content type: ${this.id}`);
      return of(type);
    });
    const list = type
      .pipe(
        switchMap((type) => type.list()),
        map(items => {
          return items.map(item => {
            this.cache.item(`${this.id}:${item.id}`).setData(item);
            return `${this.id}:${item.id}`;
          });
        }),
      );
    return list;
  }
}
