import {type Observable, defer, switchMap, of, map} from "rxjs";
import type {ContentCache} from "./content_cache";

export class CachedContentType {
  constructor(public readonly id: string, protected readonly cache: ContentCache) {}

  public list(): Observable<string[]> {
    const type = defer(() => {
      const type = this.cache.registry.get(this.id);
      if (!type) throw new Error(`Unknown content type: ${this.id}`);
      return of(type);
    });
    const list = type
      .pipe(
        switchMap((type) => type.list()),
        map(items => {
          return items.map(item => {
            const itemId = item.getId();
            const id = `${this.id}:${itemId}`
            this.cache.item(id).setData(item);
            return id;
          });
        }),
      );
    return list;
  }
}
