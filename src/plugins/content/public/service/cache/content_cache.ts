import {CachedContentItem} from "./cached_content_item";
import {CachedContentType} from "./cached_content_type";
import type {ContentRegistry} from "../registry/content_registry";

export class ContentCache {
  protected readonly cache: Map<string, CachedContentItem> = new Map();
  protected readonly typeCache: Map<string, CachedContentType> = new Map();

  constructor(public readonly registry: ContentRegistry) {}

  public type(id: string): CachedContentType {
    let type = this.typeCache.get(id);
    if (!type) {
      type = new CachedContentType(id, this);
      this.typeCache.set(id, type);
    }
    return type;
  }

  public item(id: string, refreshIfNew: boolean = true): CachedContentItem {
    let item = this.cache.get(id);
    if (!item) {
      item = new CachedContentItem(id, this);
      if (refreshIfNew) item.refresh();
      this.cache.set(id, item);
    }
    return item;
  }
}
